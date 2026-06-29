'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] text-white font-bold px-4 py-2 text-sm cursor-pointer">
      <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
    </button>
  );
}
