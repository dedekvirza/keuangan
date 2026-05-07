import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  History, 
  Wallet,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  FileText,
  Printer,
  ChevronRight,
  AlertCircle,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line
} from 'recharts';
import SignatureCanvas from 'react-signature-canvas';
import Markdown from 'react-markdown';
import { Transaction, Category, TransactionType } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { format } from 'date-fns';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'budget' | 'reports'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [auditResult, setAuditResult] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  
  // Budget Edit State
  const [editingBudget, setEditingBudget] = useState<{id: string, value: string} | null>(null);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [person, setPerson] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    storageService.seedDummyData(); // Seed if empty
    setTransactions(storageService.getTransactions().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setCategories(storageService.getCategories());
  };

  const totals = transactions.reduce((acc, curr) => {
    if (curr.type === 'INCOME') acc.income += curr.amount;
    else acc.expense += curr.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  const handleSaveTransaction = () => {
    if (!amount || !description || !person || !categoryId) {
      alert('Mohon isi semua data');
      return;
    }

    const signature = sigCanvas.current?.isEmpty() ? undefined : sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: formType,
      amount: parseFloat(amount),
      date,
      description,
      person,
      signature,
      categoryId,
      createdAt: new Date().toISOString()
    };

    storageService.saveTransaction(newTransaction);
    refreshData();
    setIsFormOpen(false);
    resetForm();
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setIsAuditModalOpen(true);
    try {
      const result = await geminiService.analyzeFinances(transactions, categories);
      setAuditResult(result);
    } catch (error) {
      setAuditResult("Gagal melakukan analisis. Mohon coba lagi.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleUpdateBudget = (id: string, amount: number) => {
    storageService.updateCategoryBudget(id, amount);
    refreshData();
    setEditingBudget(null);
  };

  const exportToCSV = (type: 'ALL' | 'INCOME' | 'EXPENSE') => {
    const data = transactions.filter(t => type === 'ALL' || t.type === type);
    const headers = ['ID', 'Type', 'Amount', 'Date', 'Description', 'Person', 'Category'];
    const rows = data.map(t => [
      t.id,
      t.type,
      t.amount,
      t.date,
      t.description.replace(/,/g, ':'),
      t.person,
      getCategoryName(t.categoryId)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_keuangan_${type.toLowerCase()}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setPerson('');
    setCategoryId('');
    sigCanvas.current?.clear();
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Lainnya';

  const categoryBreakdown = categories
    .filter(c => c.type === 'EXPENSE')
    .map(cat => {
      const spent = transactions
        .filter(t => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: cat.name,
        spent,
        budget: cat.budget || 0,
        percent: cat.budget ? (spent / cat.budget) * 100 : 0
      };
    });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'income') return t.type === 'INCOME';
    if (activeTab === 'expense') return t.type === 'EXPENSE';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">TREASURY FESTIVAL GURITA 2026</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sistem Manajemen Keuangan Terpadu</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-4 items-center">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-md text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
            Real-time Status
          </div>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFormType('INCOME');
              setIsFormOpen(true);
            }}
            className="p-2 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-200"
          >
            <PlusCircle size={20} />
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-24">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Kas Saat Ini</span>
                <span className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(balance)}</span>
              </div>
              <motion.div 
                whileHover={{ y: -2 }}
                onClick={() => setActiveTab('income')}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-24 cursor-pointer hover:border-emerald-200 transition-colors"
              >
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Pemasukan</span>
                <span className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(totals.income)}</span>
              </motion.div>
              <motion.div 
                whileHover={{ y: -2 }}
                onClick={() => setActiveTab('expense')}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-24 cursor-pointer hover:border-rose-200 transition-colors"
              >
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Pengeluaran</span>
                <span className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(totals.expense)}</span>
              </motion.div>
              <div className="bg-blue-600 p-4 rounded-xl shadow-sm border border-blue-700 flex flex-col justify-between h-24">
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">Realisasi Anggaran</span>
                <span className="text-2xl font-bold text-white">
                  {totals.income > 0 ? Math.round((totals.expense / totals.income) * 100) : 0}%
                </span>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <History size={18} className="text-slate-400" /> Riwayat Transaksi Terakhir
                  </h2>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                        <th className="px-4 py-3 font-bold">Tanggal</th>
                        <th className="px-4 py-3 font-bold text-center">Tipe</th>
                        <th className="px-4 py-3 font-bold text-right">Jumlah</th>
                        <th className="px-4 py-3 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {transactions.slice(0, 6).map(t => (
                        <tr 
                          key={t.id} 
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedTransaction(t)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900">{t.description}</span><br/>
                            <span className="text-[10px] text-slate-400">{format(new Date(t.date), 'dd MMM yyyy')}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {t.type === 'INCOME' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-right text-slate-900 whitespace-nowrap">
                            {t.type === 'EXPENSE' ? '- ' : '+ '}{formatCurrency(t.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.signature ? (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">Digital</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-slate-400 py-10 text-sm italic">Belum ada transaksi tercatat</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
                <div>
                  <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <PieChartIcon size={18} className="text-slate-400" /> Realisasi Anggaran
                  </h2>
                  <div className="space-y-5 overflow-auto pr-1">
                    {categoryBreakdown.filter(c => c.budget > 0).map(cat => (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          <span className="truncate pr-2">{cat.name}</span>
                          <span>{Math.round(cat.percent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full rounded-full ${cat.percent > 90 ? 'bg-rose-500' : cat.percent > 70 ? 'bg-amber-400' : 'bg-blue-600'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(cat.percent, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Terpakai: {formatCurrency(cat.spent)} / {formatCurrency(cat.budget)}</p>
                      </div>
                    ))}
                    {categoryBreakdown.filter(c => c.budget > 0).length === 0 && (
                      <p className="text-center text-slate-400 py-4 text-xs italic">Data anggaran belum dikonfigurasi</p>
                    )}
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 text-white flex flex-col justify-center items-center gap-3 text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Laporan Otomatis</h3>
                      <p className="text-[10px] text-slate-400 leading-tight mt-1">Data dikompilasi secara real-time untuk pelaporan acara.</p>
                    </div>
                    <button 
                      onClick={() => exportToCSV('ALL')}
                      className="w-full mt-2 py-2.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-100 transition-colors"
                    >
                      Ekspor Laporan Bulanan
                    </button>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRunAudit}
                    className="w-full p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg flex items-center gap-4 text-left border border-white/10"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                      <Sparkles className="w-5 h-5 text-indigo-100" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xs">Bendahara AI</h4>
                      <p className="text-[10px] text-indigo-100/70">Audit otomatis & saran anggaran</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-white/50" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(activeTab === 'income' || activeTab === 'expense') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                {activeTab === 'income' ? 'Rincian Uang Masuk' : 'Rincian Uang Keluar'}
              </h2>
              <button 
                onClick={() => exportToCSV(activeTab === 'income' ? 'INCOME' : 'EXPENSE')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <Download size={14} /> Ekspor Data
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Detail Transaksi</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Personil / Sumber</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(t => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransaction(t)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{t.description}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{format(new Date(t.date), 'dd MMMM yyyy')}</p>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold uppercase tracking-tight text-slate-500">
                        {getCategoryName(t.categoryId)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        {t.person}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-400 py-10 text-sm italic">Belum ada data tercatat</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Analisis Keuangan Terpadu</h2>
                <p className="text-xs text-slate-500">Periode Pelaksanaan Festival Gurita 2026</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm hover:bg-slate-50 flex items-center gap-2 text-xs font-bold uppercase tracking-tight"
              >
                <Printer size={16} /> Print Laporan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider flex items-center gap-2">
                  <PieChartIcon size={16} className="text-indigo-500" /> Komposisi Pengeluaran
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown.filter(c => c.spent > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="spent"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider flex items-center gap-2">
                  <BarChartIcon size={16} className="text-blue-500" /> Perbandingan Budget
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBreakdown.filter(c => c.budget > 0)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val/1000000}jt`} />
                      <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                      <Bar dataKey="spent" fill="#2563eb" radius={[4, 4, 0, 0]} name="Terpakai" />
                      <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Pagu Anggaran" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Saldo Bersih</p>
                    <p className="text-3xl font-black">{formatCurrency(balance)}</p>
                    <p className="text-xs text-slate-400">Total Liquiditas Tersedia</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Pencairan Dana</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.income)}</p>
                    <p className="text-xs text-slate-400">Pemasukan Terverifikasi</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">Realisasi Acara</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.expense)}</p>
                    <p className="text-xs text-slate-400">Total Biaya Operasional</p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'budget' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Manajemen Anggaran</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alokasi Dana Per Kategori Kegiatan</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => {
                  const breakdown = categoryBreakdown.find(b => b.name === cat.name);
                  const isExpense = cat.type === 'EXPENSE';
                  
                  return (
                    <motion.div 
                      key={cat.id} 
                      layout
                      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                             {cat.name}
                             {breakdown && breakdown.percent > 90 && (
                               <AlertCircle size={14} className="text-rose-500 animate-pulse" />
                             )}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {cat.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </div>
                      </div>

                      {isExpense && (
                        <div className="space-y-3 z-10">
                          <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pagu Anggaran</p>
                              {editingBudget?.id === cat.id ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    autoFocus
                                    type="number"
                                    defaultValue={cat.budget}
                                    onBlur={(e) => handleUpdateBudget(cat.id, parseFloat(e.target.value))}
                                    onKeyDown={(e) => {
                                      if(e.key === 'Enter') handleUpdateBudget(cat.id, parseFloat((e.target as HTMLInputElement).value));
                                      if(e.key === 'Escape') setEditingBudget(null);
                                    }}
                                    className="w-24 bg-slate-50 border-b-2 border-blue-600 focus:outline-none font-bold text-sm"
                                  />
                                </div>
                              ) : (
                                <p 
                                  onClick={() => setEditingBudget({id: cat.id, value: String(cat.budget)})}
                                  className="text-lg font-black text-indigo-600 cursor-pointer hover:bg-slate-50 px-1 -ml-1 rounded transition-colors"
                                >
                                  {formatCurrency(cat.budget || 0)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Terpakai</p>
                              <p className="text-sm font-bold text-slate-700">{formatCurrency(breakdown?.spent || 0)}</p>
                            </div>
                          </div>
                          
                          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                             <motion.div 
                              className={`h-full ${breakdown && breakdown.percent > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(breakdown?.percent || 0, 100)}%` }}
                             />
                          </div>
                        </div>
                      )}

                      {!isExpense && (
                        <div className="mt-2 py-4 border-t border-slate-50 flex justify-between items-center z-10">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Terkumpul</span>
                          <span className="text-lg font-black text-emerald-600">{formatCurrency(breakdown?.spent || 0)}</span>
                        </div>
                      )}
                      
                      <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity translate-x-4 translate-y-4">
                        <ShieldCheck size={100} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
           </motion.div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-between items-center z-40 shadow-lg sm:px-12 lg:px-24">
        <NavButton active={activeTab === 'dashboard'} icon={<LayoutDashboard size={18} />} label="Dasbor" onClick={() => setActiveTab('dashboard')} />
        <NavButton active={activeTab === 'income'} icon={<ArrowUpCircle size={18} />} label="Masuk" onClick={() => setActiveTab('income')} />
        <NavButton active={activeTab === 'expense'} icon={<ArrowDownCircle size={18} />} label="Keluar" onClick={() => setActiveTab('expense')} />
        <NavButton active={activeTab === 'budget'} icon={<Settings size={18} />} label="Anggaran" onClick={() => setActiveTab('budget')} />
        <NavButton active={activeTab === 'reports'} icon={<PieChart size={18} />} label="Laporan" onClick={() => setActiveTab('reports')} />
      </nav>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {formType === 'INCOME' ? 'Catat Uang Masuk' : 'Catat Uang Keluar'}
                  </h2>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button 
                    onClick={() => setFormType('INCOME')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${formType === 'INCOME' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                  >
                    Masuk
                  </button>
                  <button 
                    onClick={() => setFormType('EXPENSE')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${formType === 'EXPENSE' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}
                  >
                    Keluar
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jumlah (IDR)</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full text-3xl font-bold bg-transparent border-b border-slate-200 focus:border-blue-600 focus:outline-none py-2 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tanggal</label>
                        <input 
                          type="date" 
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kategori</label>
                        <select 
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        >
                          <option value="">Pilih...</option>
                          {categories.filter(c => c.type === formType).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{formType === 'INCOME' ? 'Diserahkan Oleh' : 'Personil Terkait'}</label>
                    <input 
                      type="text" 
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keterangan / Deskripsi</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Detail keperluan transaksi"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Otorisasi (Tanda Tangan)</label>
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-300">
                      <SignatureCanvas 
                        ref={sigCanvas}
                        penColor="#1e293b"
                        canvasProps={{ className: "w-full h-24 cursor-crosshair" }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => sigCanvas.current?.clear()}
                      className="mt-1 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                    >
                      Hapus TTD
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveTransaction}
                    className={`w-full py-4 rounded-xl text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-opacity-20 ${formType === 'INCOME' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}
                  >
                    Simpan Data Terpadu
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuditModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-xl">
                      <Sparkles className="w-6 h-6 text-white" />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold">Audit Cerdas Panitia</h2>
                     <p className="text-xs text-indigo-100">Analisis Keuangan Festival Gurita</p>
                   </div>
                </div>
                <button onClick={() => setIsAuditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto prose prose-slate prose-sm max-w-none">
                {isAuditing ? (
                  <div className="flex flex-col justify-center items-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold animate-pulse text-[10px] uppercase tracking-widest">Menganalisis Data Panitia...</p>
                  </div>
                ) : (
                  <div className="markdown-body">
                    <Markdown>{auditResult}</Markdown>
                  </div>
                )}
              </div>

              {!isAuditing && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setIsAuditModalOpen(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Selesai Audit
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTransaction && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
             <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedTransaction.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {selectedTransaction.type === 'INCOME' ? 'Voucher Masuk' : 'Kuitansi Pengeluaran'}
                 </span>
                 <button onClick={() => setSelectedTransaction(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900">{formatCurrency(selectedTransaction.amount)}</h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">{selectedTransaction.description}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</p>
                       <p className="text-xs font-bold text-slate-700">{format(new Date(selectedTransaction.date), 'dd MMMM yyyy')}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</p>
                       <p className="text-xs font-bold text-slate-700">{getCategoryName(selectedTransaction.categoryId)}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personil</p>
                       <p className="text-xs font-bold text-slate-700">{selectedTransaction.person}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipe Dana</p>
                       <p className="text-xs font-bold text-slate-700">{selectedTransaction.type}</p>
                    </div>
                 </div>

                 {selectedTransaction.signature && (
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tanda Tangan Digital Terverifikasi</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-center">
                         <img src={selectedTransaction.signature} alt="Signature" className="h-20 object-contain" />
                      </div>
                   </div>
                 )}

                 <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setSelectedTransaction(null)}
                      className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-600 text-[10px] font-black uppercase tracking-widest"
                    >
                      Tutup
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="px-6 py-4 bg-slate-900 rounded-2xl text-white shadow-xl flex items-center justify-center"
                    >
                      <Printer size={18} />
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
    </button>
  );
}

