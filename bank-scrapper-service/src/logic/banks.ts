import moment from "moment";
import axios from "axios";
import { Model } from "mongoose";
import { Accounts, IAccountModel } from "../collections/Banks";
import {
  ClientError,
  BankModel,
  IBankModal,
  CardTransactionModel,
  TransactionModel,
} from "../models";
import {
  createCredentials,
  createUpdateQuery,
  ErrorMessages,
  getFutureDebitDate,
  isArrayAndNotEmpty,
  isCardProviderCompany,
  jwt,
  RefreshedBankAccountDetails,
  SupportedCompanies,
  UserBankCredentialModel,
} from "../utils";
import { ScraperScrapingResult, ScraperOptions, CompanyTypes, createScraper } from "israeli-bank-scrapers-by-e.a";
import { PastOrFutureDebitType, Transaction, TransactionsAccount } from "israeli-bank-scrapers-by-e.a/lib/transactions";
import config from "../utils/config";

class BankLogic {
  public accounts: Model<IAccountModel> = Accounts;

  async fetchUserBanksAccounts(user_id: string, query = {}): Promise<IAccountModel> {
    return this.accounts.findOne({ user_id, ...query }).exec();
  };

  fetchBankAccount = async (user_id: string, bank_id: string): Promise<IBankModal> => {
    const mainAccount = await this.fetchUserBanksAccounts(user_id);
    return mainAccount?.banks?.find((bank) => bank._id?.toString() === bank_id);
  };

  connectBank = async (details: UserBankCredentialModel, user_id: string): Promise<RefreshedBankAccountDetails> => {
    if (!SupportedCompanies[details.companyId]) {
      throw new ClientError(500, `${ErrorMessages.COMPANY_NOT_SUPPORTED} - ${details.companyId}`);
    }

    const scrapeResult = await this.getBankData(details);
    if (scrapeResult.errorType || scrapeResult.errorMessage) {
      console.error(`Scraper error on 'BankLogic/fetchBankData': ${scrapeResult.errorMessage}.`);
      throw new ClientError(500, ErrorMessages.SOME_ERROR_TRY_AGAIN);
    }

    try {
      const account = scrapeResult.accounts[0];
      const bank = await this.insertBankAccount(user_id, details, account);
      return {
        account,
        bank
      };
    } catch (err: any) {
      throw new ClientError(500, `logic.connectBank: ${JSON.stringify(err)}`);
    }
  };

  refreshBankData = async (
    user_id: string,
    bank_id: string,
    newDetailsCredentials: string,
  ): Promise<Partial<RefreshedBankAccountDetails>> => {
    if (!config.mainServerUrl) {
      throw new ClientError(404, ErrorMessages.MAIN_SERVER_URL_NOT_FOUND);
    }

    const bankAccount = await bankLogic.fetchBankAccount(user_id, bank_id);
    if (!bankAccount) {
      throw new ClientError(500, 'Some error while trying to find user with this account. Please contact us');
    }

    const credentials = newDetailsCredentials ? newDetailsCredentials : bankAccount?.credentials;
    if (!credentials) {
      throw new ClientError(500, 'Some error while trying to load saved credentials. Please contact us');
    }

    const decodedCredentials = await jwt.fetchBankCredentialsFromToken(credentials);
    if (!decodedCredentials) {
      throw new ClientError(500, 'Some error while trying to load decoded credentials. Please contact us');
    }

    const details: UserBankCredentialModel = {
      companyId: decodedCredentials.companyId,
      id: decodedCredentials.id,
      password: decodedCredentials.password,
      num: decodedCredentials.num,
      save: decodedCredentials.save,
      username: decodedCredentials.username
    };

    const scrapeResult = await this.getBankData(details);
    if (scrapeResult.errorType || scrapeResult.errorMessage) {
      throw new ClientError(500, `scrapeResult.error: ${scrapeResult.errorMessage}`);
    }

    let insertedTransactions: any[] = [];

    const account = scrapeResult.accounts[0];
    if (account?.txns && isArrayAndNotEmpty(account.txns)) {
      try {
        const transactions = await this.importTransactions(account.txns, user_id, details.companyId);
        insertedTransactions = [...insertedTransactions, ...transactions];
      } catch (err: any) {
        throw new ClientError(500, `refreshBankData: Some error while trying to import transactions: ${JSON.stringify(err)}`);
      }
    }

    if (account?.cardsPastOrFutureDebit && isArrayAndNotEmpty(account.cardsPastOrFutureDebit?.cardsBlock)) {
      const promises = account.cardsPastOrFutureDebit.cardsBlock
        .filter((card) => isArrayAndNotEmpty(card.txns))
        .map(async (card) => {
          if (card.cardStatusCode && card.cardStatusCode === 9) return;
          try {
            const cardTransactions = await this.importTransactions(card.txns, user_id, details.companyId);
            insertedTransactions = [...insertedTransactions, ...cardTransactions];
          } catch (err: any) {
            throw new ClientError(500, `refreshBankData: Some error while trying to import cards past or future debits: ${JSON.stringify(err)}`);
          }
        });

      await Promise.all(promises);
    }

    if (account?.pastOrFutureDebits && isArrayAndNotEmpty(account?.pastOrFutureDebits)) {
      try {
        const updatedPastOrFutureDebits = await this.importPastOrFutureDebits(
          user_id,
          bank_id,
          account.pastOrFutureDebits
        );
        updatedPastOrFutureDebits.sort((a, b) => (getFutureDebitDate(a.debitMonth) - getFutureDebitDate(b.debitMonth)));
        account.pastOrFutureDebits = updatedPastOrFutureDebits;
      } catch (err: any) {
        throw new ClientError(500, `refreshBankData: Some error while trying to import past or future debits: ${JSON.stringify(err)}`);
      }
    }

    try {
      const bank = await this.insertBankAccount(user_id, details, account);
      return {
        bank,
        importedTransactions: insertedTransactions,
        // todo: add importedCategories
      };
    } catch (err: any) {
      throw new ClientError(500, err?.message || JSON.stringify(err));
    }
  };

  updateBankAccountDetails = async (bank_id: string, user_id: string, newDetails: UserBankCredentialModel) => {
    const bankAccount = await bankLogic.fetchBankAccount(user_id, bank_id);
    if (!bankAccount) {
      throw new ClientError(500, ErrorMessages.USER_BANK_ACCOUNT_NOT_FOUND);
    }

    const credentials = bankAccount?.credentials;
    if (credentials) {
      const decodedCredentials = await jwt.fetchBankCredentialsFromToken(credentials);
      if (!decodedCredentials) {
        throw new ClientError(500, ErrorMessages.DECODED_CREDENTIALS_NOT_LOADED);
      }

      const oldCredentials = [];
      oldCredentials.push(decodedCredentials);
    }

    const newDetailsCredentials = jwt.createNewToken(newDetails);
    const refreshedBankData = await this.refreshBankData(user_id, bank_id, newDetailsCredentials);
    return refreshedBankData;
  };

  importTransactions = async (
    transactions: Transaction[],
    user_id: string,
    companyId: string,
  ): Promise<(TransactionModel & CardTransactionModel & Transaction)[]> => {
    try {
      const res = await axios.post<(TransactionModel & CardTransactionModel & Transaction)[]>(
        `${config.mainServerUrl}/api/import-transactions/${user_id}`,
        { transactions, companyId }
      );
      const importedTransactions = res.data;
      return importedTransactions;
    } catch (error: any) {
      throw new ClientError(500, `importTransactions': ${error.message || JSON.stringify(error)}`);
    }
  };

  importPastOrFutureDebits = async (
    user_id: string,
    bank_id: string,
    pastOrFutureDebits: PastOrFutureDebitType[] = []
  ): Promise<PastOrFutureDebitType[]> => {
    const bankAccount = await this.fetchBankAccount(user_id, bank_id);
    const bankPastOrFutureDebits = bankAccount.pastOrFutureDebits || [];

    pastOrFutureDebits.forEach((debit) => {
      if (!bankPastOrFutureDebits.find((d) => d.debitMonth === debit.debitMonth)) {
        bankPastOrFutureDebits.push(debit);
      }
    });

    return bankPastOrFutureDebits;
  };

  setMainBankAccount = async (user_id: string, bank_id: string): Promise<void> => {
    try {
      const bankAccount = await this.fetchUserBanksAccounts(user_id, { 'banks._id': bank_id });
      const banks = bankAccount.banks.map((bank) => {
        if (bank._id.toString() === bank_id.toString()) {
          bank.isMainAccount = true;
        } else {
          bank.isMainAccount = false;
        }
        return bank;
      });
      await this.accounts.findOneAndUpdate(
        { user_id: bankAccount.user_id },
        { $set: { banks } }
      ).exec();
    } catch (err: any) {
      throw new ClientError(500, `setMainBankAccount: Error saving the document - ${err?.message || JSON.stringify(err)}`);
    }
  };

  removeBankAccount = async (user_id: string, bank_id: string): Promise<void> => {
    const bankAccount = await this.fetchBankAccount(user_id, bank_id);
    if (!bankAccount) {
      throw new ClientError(500, ErrorMessages.USER_BANK_ACCOUNT_NOT_FOUND);
    }

    await this.accounts.findOneAndUpdate(
      { user_id },
      { $pull: {
        banks: { _id: bankAccount._id }
      }
    }).exec();
  };

  insertBankAccount = async (
    user_id: string,
    details: UserBankCredentialModel,
    account: TransactionsAccount
  ): Promise<IBankModal> => {
    const banksAccount = await bankLogic.fetchUserBanksAccounts(user_id);
    const currBankAccount = banksAccount?.banks?.find((b) => {
      return b.bankName.toLowerCase() === details.companyId.toLowerCase();
    });
  
    if (currBankAccount) {
      return await this.updateBank(currBankAccount, user_id, account, details);
    }
  
    try {
      const newBank = await this.createBank(details.companyId, details, account);
      await this.accounts.findOneAndUpdate(
        { user_id: user_id },
        { $push: { banks: newBank } },
        { new: true, upsert: true }
      ).exec();
  
      return newBank;
    } catch (err: any) {
      console.log({ 'insertBankAccount': err });
    }
  };

  updateBank = async (
    currBankAccount: IBankModal,
    user_id: string,
    account: TransactionsAccount,
    details: UserBankCredentialModel
  ): Promise<IBankModal> => {
    const query = createUpdateQuery(account, details);
    const options = {
      user_id: user_id,
      'banks._id': currBankAccount._id
    };
    const projection = {
      new: true,
      upsert: true
    };
  
    try {
      const bankAccounts = await Accounts.findOneAndUpdate(options, query, projection).exec();
      return bankAccounts.banks.find((b) => b._id?.toString() === currBankAccount._id?.toString());
    } catch (error: any) {
      console.log({ 'updateBank': error });
      return;
    }
  };
  
  createBank = async (
    bankName: string,
    credentialsDetails: UserBankCredentialModel,
    account: TransactionsAccount
  ): Promise<IBankModal> => {
    const isCardProvider = isCardProviderCompany(credentialsDetails.companyId);
  
    const bankAccount = new BankModel({
      bankName,
      isCardProvider,
      lastConnection: new Date().valueOf(),
      details: {
        accountNumber: account.accountNumber,
        balance: account.balance,
      },
      cardsPastOrFutureDebit: account.cardsPastOrFutureDebit,
      extraInfo: account.info,
      pastOrFutureDebits: account?.pastOrFutureDebits,
      savings: account?.saving,
      loans: account?.loans,
      ...(credentialsDetails?.save && {
        credentials: jwt.createNewToken(credentialsDetails),
      }),
    });
  
    return bankAccount;
  };

  getBankData = async (details: UserBankCredentialModel): Promise<ScraperScrapingResult> => {
    const lastYear = moment().subtract('1', 'years').calendar();
  
    const options: ScraperOptions = {
      companyId: SupportedCompanies[details.companyId] as CompanyTypes,
      startDate: new Date(lastYear),
      combineInstallments: false,
      showBrowser: true,
      defaultTimeout: 10000
    };
  
    const credentials = createCredentials(details);
  
    const scraper = createScraper(options);
    const scrapeResult = await scraper.scrape(credentials);
    return scrapeResult;
  };
};

const bankLogic = new BankLogic();
export default bankLogic;