import { Transaction, Category } from '../types';

const TRANSACTIONS_KEY = 'festival_gurita_transactions';
const CATEGORIES_KEY = 'festival_gurita_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'inc-pemerintah', name: 'Hibah Pemerintah', type: 'INCOME' },
  { id: 'inc-sponsor', name: 'Sponsor', type: 'INCOME' },
  { id: 'inc-donasi', name: 'Donasi Masyarakat', type: 'INCOME' },
  { id: 'exp-panggung', name: 'Panggung & Sound System', type: 'EXPENSE', budget: 15000000 },
  { id: 'exp-konsumsi', name: 'Konsumsi Pelaksana', type: 'EXPENSE', budget: 5000000 },
  { id: 'exp-hadiah', name: 'Hadiah Lomba', type: 'EXPENSE', budget: 10000000 },
  { id: 'exp-publikasi', name: 'Publikasi & Dokumentasi', type: 'EXPENSE', budget: 3000000 },
];

export const storageService = {
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = storageService.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  },

  deleteTransaction: (id: string) => {
    const transactions = storageService.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
  },

  getCategories: (): Category[] => {
    const data = localStorage.getItem(CATEGORIES_KEY);
    return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
  },

  saveCategory: (category: Category) => {
    const categories = storageService.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  },
  
  seedDummyData: () => {
    const currentTransactions = storageService.getTransactions();
    if (currentTransactions.length > 0) return;

    const dummy: Transaction[] = [
      {
        id: 'dummy-1',
        type: 'INCOME',
        amount: 50000000,
        date: '2026-05-01',
        description: 'Pencairan Hibah Pemerintah Kabupaten Kaur Tahap 1',
        person: 'Dinas Pariwisata',
        categoryId: 'inc-pemerintah',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dummy-2',
        type: 'INCOME',
        amount: 15000000,
        date: '2026-05-03',
        description: 'Sponsor Utama PT. Bahari Sejahtera',
        person: 'Bpk. Kurniawan',
        categoryId: 'inc-sponsor',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dummy-3',
        type: 'EXPENSE',
        amount: 12000000,
        date: '2026-05-05',
        description: 'DP Sewa Panggung & Sound System Utama',
        person: 'Doni (Sie Perlengkapan)',
        categoryId: 'exp-panggung',
        createdAt: new Date().toISOString()
      },
      {
        id: 'dummy-4',
        type: 'EXPENSE',
        amount: 2500000,
        date: '2026-05-06',
        description: 'Konsumsi Rapat Koordinasi Panitia Besar',
        person: 'Ibu Siti (Sie Konsumsi)',
        categoryId: 'exp-konsumsi',
        createdAt: new Date().toISOString()
      }
    ];

    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(dummy));
  },

  updateCategoryBudget: (id: string, budget: number) => {
    const categories = storageService.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index >= 0) {
      categories[index].budget = budget;
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
  }
};
