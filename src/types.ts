export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  budget?: number; // Monthly budget or total event budget
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  person: string; // The person who submitted/spent
  signature?: string; // Base64 string of signature
  categoryId: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    amount: number;
    budget?: number;
  }[];
}
