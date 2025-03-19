import { Transaction, TransactionStatuses } from "israeli-bank-scrapers-by-e.a/lib/transactions";

export interface TransactionModel extends Transaction {
  user_id: string;
  date: string;
  identifier: number | string;
  category_id: string;
  description: string;
  amount: number;
  status: TransactionStatuses;
  companyId: string;
};

export interface CardTransactionModel extends Transaction {
  user_id: string;
  cardNumber: string | number;
  date: string;
  identifier: number | string;
  category_id: string;
  description: string;
  amount: number;
  status: TransactionStatuses;
  companyId?: string;
};