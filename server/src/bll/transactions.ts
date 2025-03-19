import { Transaction, TransactionStatuses } from "israeli-bank-scrapers-by-e.a/lib/transactions";
import ClientError from "../models/client-error";
import { ITransactionModel, Transactions } from "../collections/Transactions";
import { CardTransactions, ICardTransactionModel } from "../collections/Card-Transactions";
import { Model } from "mongoose";
import { isCardProviderCompany } from "../utils/bank-utils";
import categoriesLogic from "./categories-logic";
import { ICategoryModel } from "../models/category-model";

type MainTransactionType = ITransactionModel & ICardTransactionModel & Transaction;
export type TransactionParams = {
  query: object;
  projection: object;
  options: object;
};

export const getTotalTransactionsAmounts = (transactions: MainTransactionType[]): number => {
  return transactions.reduce((acc, t) => acc + t.amount, 0);
};

export const importTransactions = async (
  transactions: Transaction[],
  user_id: string,
  companyId: string,
): Promise<MainTransactionType[]> => {
  const userCategories = await categoriesLogic.fetchCategoriesByUserId(user_id, false);
  const mappedCategories = new Map<string, ICategoryModel>();
  userCategories.forEach((category) => {
    if (mappedCategories.has(category.name)) return;
    mappedCategories.set(category.name, category);
  });

  // let defCategory = await categoriesLogic.fetchUserCategory(user_id, 'Others');
  let defCategory = mappedCategories.get('Others');
  if (!defCategory) {
    try {
      defCategory = await categoriesLogic.addNewCategory('Others', user_id);
    } catch (err: any) {
      throw new Error(`[bankLogic/importTransactions]: Some error while trying to add default category - ${err?.message}` );
    }
  }

  const isCardTransactions = isCardProviderCompany(companyId);
  const transactionsToInsert: ITransactionModel[] = [];
  const cardsTransactionsToInsert: ICardTransactionModel[] = [];
  let inserted: (ITransactionModel | ICardTransactionModel)[] = [];

  for (const originalTransaction of transactions) {
    const {
      status,
      date,
      originalAmount,
      chargedAmount,
      description,
      categoryDescription,
      category,
      identifier,
      cardNumber,
    } = originalTransaction;
    if (!identifier) continue;

    const existedTransaction = await transactionsLogic
      .fetchUserBankTransaction(originalTransaction, companyId, user_id);
    if (existedTransaction) {
      if (existedTransaction.status?.toLowerCase() !== status?.toLowerCase()) {
        try {
          const trans = await transactionsLogic.updateTransactionStatus(existedTransaction, status);
          inserted.push(trans);
        } catch (err: any) {
          console.log(`Some error while trying to update transaction ${existedTransaction.identifier} - ${err?.message}`);
          throw new ClientError(500, `Some error while trying to update transaction ${existedTransaction.identifier}`);
        }
      }
      continue;
    }

    const originalCategory = category ?? categoryDescription;
    let originalTransactionCategory = mappedCategories.get(originalCategory);
    if (!originalTransactionCategory?._id) {
      if (category ?? categoryDescription) {
        try {
          originalTransactionCategory = await categoriesLogic.addNewCategory(category ?? categoryDescription, user_id);
        } catch (error) {
          console.log({ 'originalTransactionCategory.newCategory': error });
        }
      } else {
        originalTransactionCategory = defCategory;
      }
    }

    const transaction = {
      user_id,
      date,
      description,
      companyId,
      status,
      identifier,
      amount: originalAmount || chargedAmount,
      category_id: originalTransactionCategory._id,
    };
    if (isCardTransactions) {
      const transToInsert = new CardTransactions({
        ...transaction,
        ...originalTransaction,
        cardNumber
      });
      cardsTransactionsToInsert.push(transToInsert);
    } else {
      const transToInsert = new Transactions({
        ...transaction,
        ...originalTransaction,
      });
      transactionsToInsert.push(transToInsert);
    }
  }

  try {
    if (isCardTransactions) {
      const insertedCardsTrans = await CardTransactions.insertMany(cardsTransactionsToInsert, {
        ordered: false,
        throwOnValidationError: false,
      });
      inserted = [...inserted, ...insertedCardsTrans];
    } else {
      const insertedTrans = await Transactions.insertMany(transactionsToInsert, {
        ordered: false,
        throwOnValidationError: false,
      });
      inserted = [...inserted, ...insertedTrans];
    }

    return inserted;
  } catch (err: any) {
    console.log({ ['bankLogic/importTransactions']: err?.message, inserted });
    throw new ClientError(500, `An error occurred while importing transactions, ${JSON.stringify(err)}`);
  }
};

class TransactionsLogic {
  fetchUserTransactions = async (
    user_id: string,
    params: Partial<TransactionParams>,
    type?: string,
  ): Promise<{ transactions: (MainTransactionType)[], total: number }> => {
    const { query, projection, options } = params;
    const collection: Model<MainTransactionType> = type === 'creditCards' ? CardTransactions : Transactions;

    let transactions = [];
    let total: number = 0;

      total = await collection.countDocuments({ user_id, ...query });
      transactions = await collection.find({ user_id, ...query }, projection, { ...options, sort: { 'date': -1 } });

    return {
      transactions,
      total
    };
  };

  fetchUserBankTransaction = async (
    transaction: Transaction,
    companyId: string,
    user_id: string
  ): Promise<MainTransactionType> => {
    const isCardTransaction = isCardProviderCompany(companyId);
    let trans: MainTransactionType = undefined;

    const cardNumber = transaction?.cardNumber ? transaction.cardNumber : '';
    const identifier = isCardTransaction ? transaction.identifier.toString() + cardNumber : transaction.identifier;
    const query: object = {
      ...(transaction?.identifier ? {
          identifier
        } : {
          ...(transaction?.memo ? {
            memo: transaction.memo
          } : {}),
          ...(transaction?.date ? {
            date: transaction.date
          } : {}),
          ...(transaction.cardNumber ? {
            cardNumber: transaction.cardNumber
          } : {}),
          companyId,
          description: transaction.description,
          amount: transaction.chargedAmount || transaction.originalAmount,
        }),
    };

    let collection: Model<any> = Transactions;
    if (isCardTransaction) {
      collection = CardTransactions;
    }

    trans = await collection.findOne({ user_id, ...query }).exec();
    return trans;
  };

  newTransaction = async (
    user_id: string,
    transaction: MainTransactionType,
    type?: string
  ): Promise<MainTransactionType> => {
    if (!user_id) {
      throw new ClientError(500, 'User id is missing');
    }
    const isCardTransaction = isCardProviderCompany(transaction.companyId) || type !== 'transactions';
    let newTransaction: MainTransactionType = null;

    if (isCardTransaction) {
      newTransaction = new CardTransactions({
        user_id,
        cardNumber: transaction?.cardNumber || null,
        ...transaction
      });
    } else {
      newTransaction = new Transactions({
        user_id,
        ...transaction
      });
    }

    const errors = newTransaction.validateSync();
    if (errors) {
      throw new ClientError(500, errors.message);
    }

    return newTransaction.save();
  };

  updateTransaction = async (user_id: string, transaction: MainTransactionType, type: string = 'Account'): Promise<MainTransactionType> => {
    const isCardTransaction = type !== 'transactions';
    const collection: Model<MainTransactionType> = isCardTransaction ? CardTransactions : Transactions;

    const currentTransaction = await collection.findOne({ user_id, _id: transaction._id }).exec();
    if (!currentTransaction) {
      throw new ClientError(400, 'User transaction not found');
    }

    const updatedTransaction = await collection.findOneAndUpdate({ user_id, _id: transaction._id }, {
      $set: {
        ...transaction,
        date: transaction.date,
        category_id: transaction.category_id,
        description: transaction.description,
        amount: transaction.amount,
        status: transaction.status || TransactionStatuses.Completed,
      }
    }, { new: true }).exec();

    const errors = updatedTransaction.validateSync();
    if (errors) {
      throw new ClientError(500, errors.message);
    }

    return updatedTransaction;
  };

  updateTransactionStatus = async (
    transaction: MainTransactionType,
    status: string
  ): Promise<MainTransactionType> => {
    const isCardProvider = isCardProviderCompany(transaction.companyId);
    const query = {
      _id: transaction._id,
      query: { $set: { status } },
      projection: { new: true }
    };
    if (isCardProvider) {
      return await CardTransactions.findByIdAndUpdate(query).exec();
    }
    return await Transactions.findByIdAndUpdate(query).exec();
  };

  removeTransaction = async (user_id: string, transaction_id: string, type: string = 'transactions'): Promise<void> => {
    const isCardTransaction = type !== 'transactions';
    const query = { user_id, _id: transaction_id };
    try {
      if (isCardTransaction) {
        await CardTransactions.findOneAndDelete(query).exec();
      }
      await Transactions.findByIdAndDelete(query).exec();
    } catch (err: any) {
      console.log(err);
    }
  };
};

const transactionsLogic = new TransactionsLogic();

export default transactionsLogic;