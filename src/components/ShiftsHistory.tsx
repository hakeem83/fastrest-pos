import React from 'react';
import { Shift } from '../types';
import { formatCurrency, StorageService } from '../services/storage';

interface Props {
  shifts: Shift[];
  currency: string;
}

export const ShiftsHistory: React.FC<Props> = ({ shifts, currency }) => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">رقم الوردية</th>
              <th className="py-3 px-4">الكاشير</th>
              <th className="py-3 px-4">التاريخ</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4">عهدة البداية</th>
              <th className="py-3 px-4">إجمالي المبيعات</th>
              <th className="py-3 px-4">صافي الدرج المتوقع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {shifts.map((sh) => {
              const calc = StorageService.calculateShiftCash(sh);
              return (
                <tr key={sh.id}>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">
                    #{sh.shiftNumber}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{sh.cashierName}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{sh.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sh.status === 'open'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sh.status === 'open' ? 'مفتوحة حالياً' : 'مغلقة'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {formatCurrency(sh.openingCustody, currency)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {formatCurrency(calc.totalSales, currency)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {formatCurrency(calc.expectedCashInDrawer, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
