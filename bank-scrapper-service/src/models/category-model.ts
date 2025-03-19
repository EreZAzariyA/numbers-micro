export interface CategoryModel {
  name: string;
  spent: number;
  maximumSpentAllowed?: {
    active: boolean;
    maximumAmount: number;
  }
};