import React, { useState } from 'react';
import { InventoryItem, RestaurantSettings, Shift, Supplier, Voucher } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import { Eye, Save, Truck, X } from 'lucide-react';

interface Props {
  activeShift: Shift;
  settings: RestaurantSettings;
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onClose: () => void;
  onSuccess: (newVoucher: Voucher, shouldPrint: boolean) => void;
  onSupplierCreated: () => void;
}

export const CashierCreditInvoiceModal: React.FC<Props> = ({
  activeShift,
  settings,
  suppliers,
  onClose,
  onSuccess,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSave = (shouldPrint: boolean) => {
    setError('');
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      setError('يرجى اختيار المورد أولاً');
      return;
    }
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setError('يرجى إدخال قيمة الفاتورة الآجلة');
      return;
    }
    const amountMinor = Math.round(val * 100);
    const created = StorageService.addVoucher({
      shiftId: activeShift.id,
      type: 'credit_purchase',
      amount: amountMinor,
      accountCode: 'CRD-301',
      accountName: 'مشتريات وتوريدات آجلة (غير نقدية)',
      recipient: sup.name,
      description: description.trim() || `استلام بضاعة بالآجل من المورد ${sup.name}`,
      cashierName: activeShift.cashierName,
      supplierId: sup.id,
      invoiceNo: invoiceNo.trim() || undefined,
    });
    onSuccess(created, shouldPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white">
              إثبات فاتورة استلام بضاعة بالآجل (بدون خصم من الكاش)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">المورد المسلّم:</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — الرصيد الحالي: {formatCurrency(s.creditBalance, settings.currency)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-300 block mb-1">رقم فاتورة المورد:</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="INV-900"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                قيمة الفاتورة ({settings.currency}):
              </label>
              <input
                type="number"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">بيان الأصناف المستلمة:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: استلام 20 كجم لحوم ودواجن..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="py-2.5 px-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>حفظ ومعاينة الطباعة</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ فقط</span>
          </button>
        </div>
      </div>
    </div>
  );
};
