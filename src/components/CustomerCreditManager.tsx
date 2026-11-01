import React, { useState } from 'react';
import { Customer, Shift, Voucher } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import {
  Eye,
  HandCoins,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface Props {
  customers: Customer[];
  activeShift: Shift | null;
  currency: string;
  onRefresh: () => void;
  onVoucherCreated?: (voucher: Voucher) => void;
}

export const CustomerCreditManager: React.FC<Props> = ({
  customers,
  activeShift,
  currency,
  onRefresh,
  onVoucherCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allowCredit, setAllowCredit] = useState(true);
  const [creditLimitStr, setCreditLimitStr] = useState('3000');

  const [collectCustId, setCollectCustId] = useState<string>('');
  const [collectAmountStr, setCollectAmountStr] = useState<string>('');

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      code: `CST-0${customers.length + 1}`,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      allowCredit,
      creditLimit: Math.max(0, Math.round((parseFloat(creditLimitStr) || 0) * 100)),
      currentDebt: 0,
    };
    StorageService.saveCustomers([newCust, ...customers]);
    setName('');
    setPhone('');
    setAddress('');
    onRefresh();
  };

  const handleToggleCreditAuth = (id: string) => {
    const updated = customers.map((c) =>
      c.id === id ? { ...c, allowCredit: !c.allowCredit } : c
    );
    StorageService.saveCustomers(updated);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    StorageService.saveCustomers(customers.filter((c) => c.id !== id));
    onRefresh();
  };

  const handleCollect = (cust: Customer) => {
    const val = parseFloat(collectAmountStr);
    if (isNaN(val) || val <= 0 || !activeShift) return;
    const amountMinor = Math.round(val * 100);
    const v = StorageService.addVoucher({
      shiftId: activeShift.id,
      type: 'customer_collection',
      amount: amountMinor,
      accountCode: 'REC-202',
      accountName: 'تحصيل مديونية عملاء آجل',
      recipient: cust.name,
      description: `تحصيل دفعة نقدية من مديونية العميل ${cust.name}`,
      cashierName: activeShift.cashierName,
      customerId: cust.id,
    });
    setCollectCustId('');
    setCollectAmountStr('');
    onRefresh();
    if (onVoucherCreated) onVoucherCreated(v);
  };

  return (
    <div className="space-y-5">
      {/* Add New Customer Form */}
      <form
        onSubmit={handleAddCustomer}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs"
      >
        <div className="flex items-center gap-2 font-black text-white text-sm">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>إضافة عميل جديد وتحديد صلاحية البيع الآجل</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم العميل / الشركة *"
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
            type="number"
            min="0"
            value={creditLimitStr}
            onChange={(e) => setCreditLimitStr(e.target.value)}
            placeholder={`الحد الائتماني (${currency})`}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
          />
          <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCredit}
              onChange={(e) => setAllowCredit(e.target.checked)}
              className="accent-amber-500"
            />
            <span className="font-bold text-slate-200">مصرح له بالبيع الآجل</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل العميل</span>
          </button>
        </div>
      </form>

      {/* Customers Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الكود</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">صلاحية البيع الآجل</th>
                <th className="py-3 px-4">الحد الائتماني</th>
                <th className="py-3 px-4">المديونية الحالية</th>
                <th className="py-3 px-4">تحصيل / إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono text-slate-400">{c.code}</td>
                  <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{c.phone}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleCreditAuth(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        c.allowCredit
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {c.allowCredit ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>مصرح بالآجل</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>موقوف / نقدي فقط</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {c.creditLimit > 0 ? formatCurrency(c.creditLimit, currency) : 'مفتوح'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">
                    {formatCurrency(c.currentDebt, currency)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {collectCustId === c.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="المبلغ"
                            value={collectAmountStr}
                            onChange={(e) => setCollectAmountStr(e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleCollect(c)}
                            className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تحصيل ومعاينة</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCollectCustId(c.id)}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          <span>تحصيل دفعة</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
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
