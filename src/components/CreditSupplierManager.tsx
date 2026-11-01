import React, { useState } from 'react';
import { Shift, Supplier, Voucher } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import { CreditCard, Eye, Plus, Trash2 } from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  activeShift: Shift | null;
  currency: string;
  onRefresh: () => void;
  onVoucherCreated?: (voucher: Voucher) => void;
}

export const CreditSupplierManager: React.FC<Props> = ({
  suppliers,
  activeShift,
  currency,
  onRefresh,
  onVoucherCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [supplyCategory, setSupplyCategory] = useState('لحوم ودواجن');
  const [payingSupId, setPayingSupId] = useState('');
  const [payAmountStr, setPayAmountStr] = useState('');

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      code: `SUP-0${suppliers.length + 1}`,
      name: name.trim(),
      phone: phone.trim(),
      supplyCategory: supplyCategory.trim(),
      creditBalance: 0,
    };
    StorageService.saveSuppliers([newSup, ...suppliers]);
    setName('');
    setPhone('');
    onRefresh();
  };

  const handlePaySupplier = (sup: Supplier) => {
    const val = parseFloat(payAmountStr);
    if (isNaN(val) || val <= 0 || !activeShift) return;
    const v = StorageService.addVoucher({
      shiftId: activeShift.id,
      type: 'supplier_payment',
      amount: Math.round(val * 100),
      accountCode: 'EXP-105',
      accountName: 'سداد دفعات موردين آجل',
      recipient: sup.name,
      description: `سداد دفعة نقدية للمورد ${sup.name}`,
      cashierName: activeShift.cashierName,
      supplierId: sup.id,
    });
    setPayingSupId('');
    setPayAmountStr('');
    onRefresh();
    if (onVoucherCreated) onVoucherCreated(v);
  };

  const handleDelete = (id: string) => {
    StorageService.saveSuppliers(suppliers.filter((s) => s.id !== id));
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAddSupplier}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs"
      >
        <div className="flex items-center gap-2 font-black text-white text-sm">
          <CreditCard className="w-4 h-4 text-amber-400" />
          <span>إضافة مورد بضاعة وخامات جديد</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المورد / الشركة *"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الهاتف"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
          <input
            type="text"
            value={supplyCategory}
            onChange={(e) => setSupplyCategory(e.target.value)}
            placeholder="نوع التوريد (لحوم، بقوليات...)"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة المورد</span>
          </button>
        </div>
      </form>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الكود</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4">التخصص</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">الرصيد المستحق للمورد</th>
                <th className="py-3 px-4">سداد / إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono text-slate-400">{s.code}</td>
                  <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                  <td className="py-3 px-4 text-slate-300">{s.supplyCategory}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{s.phone}</td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-400">
                    {formatCurrency(s.creditBalance, currency)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {payingSupId === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="المبلغ"
                            value={payAmountStr}
                            onChange={(e) => setPayAmountStr(e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handlePaySupplier(s)}
                            className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>سداد ومعاينة</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPayingSupId(s.id)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg cursor-pointer"
                        >
                          سداد دفعة
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
