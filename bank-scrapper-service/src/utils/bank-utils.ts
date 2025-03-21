import { CompanyTypes, ScraperCredentials } from "israeli-bank-scrapers-by-e.a";
import { TransactionsAccount } from "israeli-bank-scrapers-by-e.a/lib/transactions";
import { ErrorMessages, UserBankCredentialModel } from "./helpers";
import { ClientError,  } from "../models";
import { jwt } from ".";

export const SupportedCompanies: Record<string, string> = {
  [CompanyTypes.discount]: CompanyTypes.discount,
  [CompanyTypes.max]: CompanyTypes.max,
  [CompanyTypes.behatsdaa]: CompanyTypes.behatsdaa,
  [CompanyTypes.leumi]: CompanyTypes.leumi,
  [CompanyTypes.visaCal]: CompanyTypes.visaCal,
};

export const CreditCardProviders = [
  SupportedCompanies.visaCal,
  SupportedCompanies.max,
  SupportedCompanies.behatsdaa,
];

export const isCardProviderCompany = (company: string) => {
  return CreditCardProviders.includes(company) || false;
};

export const createCredentials = (details: UserBankCredentialModel): ScraperCredentials => {
  if (!(SupportedCompanies as any)[details.companyId]) {
    throw new ClientError(500, `${ErrorMessages.COMPANY_NOT_SUPPORTED} - ${details.companyId}`);
  }

  let credentials: ScraperCredentials = null;
  switch (details.companyId) {
    case SupportedCompanies[CompanyTypes.discount]:
      credentials = {
        id: details.id,
        password: details.password,
        num: details.num
      };
    break;
    case SupportedCompanies[CompanyTypes.max]:
      credentials = {
        username: details.username,
        password: details.password
      };
    break;
    case SupportedCompanies[CompanyTypes.visaCal]:
      credentials = {
        username: details.username,
        password: details.password
      };
    break;
  };

  return credentials;
};

export const createUpdateQuery = (account: TransactionsAccount, details: UserBankCredentialModel): object => ({
  $set: {
    'banks.$.lastConnection': new Date().valueOf(),
    'banks.$.details': {
      balance: account?.balance,
    },
    'banks.$.extraInfo': account?.info,
    'banks.$.pastOrFutureDebits': account?.pastOrFutureDebits,
    'banks.$.cardsPastOrFutureDebit': account?.cardsPastOrFutureDebit,
    'banks.$.savings': account?.saving,
    'banks.$.loans': account?.loans,
    ...(details.save && {
      'banks.$.credentials': jwt.createNewToken(details)
    })
  }
});