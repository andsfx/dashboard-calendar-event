// Augmentasi tipe: jspdf-autotable v5 menempel `lastAutoTable` ke instance jsPDF
// saat memakai API fungsional autoTable(doc, ...). Tidak dideklarasikan di types
// upstream, jadi dideklarasikan di sini untuk menghindari cast di callsites.
import type { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
      body: Array<{ raw: string[]; section: string }>;
    };
  }
}
