import { GoogleGenAI } from "@google/genai";
import { Transaction, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async analyzeFinances(transactions: Transaction[], categories: Category[]): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return "Sistem Audit AI memerlukan API Key. Mohon konfigurasi di Secrets panel.";
    }

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    
    const categoryAnalysis = categories.filter(c => c.type === 'EXPENSE').map(cat => {
      const spent = transactions.filter(t => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
      return {
        name: cat.name,
        spent,
        budget: cat.budget || 0,
        status: cat.budget ? (spent > cat.budget ? 'OVER_BUDGET' : 'SAFE') : 'NO_BUDGET'
      };
    });

    const prompt = `
      Anda adalah Bendahara Audit cerdas untuk Festival Gurita Kabupaten Kaur 2026.
      Berikut adalah ringkasan keuangan saat ini:
      - Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
      - Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
      - Saldo: Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}

      Analisis Kategori Pengeluaran:
      ${JSON.stringify(categoryAnalysis, null, 2)}

      Tugas Anda:
      1. Berikan ringkasan singkat kondisi keuangan dalam 2-3 kalimat.
      2. Identifikasi kategori yang sudah atau hampir melewati budget.
      3. Berikan 3 rekomendasi taktis untuk bendahara untuk menghemat budget atau mengalokasikan sisa dana.
      4. Gunakan gaya bahasa profesional namun suportif ala asisten panitia.
      5. Berikan jawaban dalam Bahasa Indonesia.
      
      Format respon dengan Markdown yang rapi.
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      return result.text || "Tidak ada hasil analisis.";
    } catch (error) {
      console.error("Gemini analysis error:", error);
      return "Maaf, terjadi kesalahan saat melakukan analisis audit AI. Silakan coba lagi nanti.";
    }
  }
};
