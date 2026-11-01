import React, { useMemo, useState } from 'react';
import {
  AppUser,
  AuditCorrectionLog,
  InventoryItem,
  SaleOrder,
  Voucher,
} from '../types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getPaymentMethodLabel,
  getVoucherTypeLabel,
  StorageService,
} from '../services/storage';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Package,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  currency: string;
  activeUser: AppUser;
  inventory: InventoryItem[];
  onRefresh: () => void;
}

export const ErrorCorrectionHub: React.FC<Props> = ({
  currency,
  activeUser,
  inventory,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<
    'orders' | 'vouchers' | 'inventory_adj' | 'audit_log'
  >('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Order reversal modal state
  const [selectedOrderForReversal, setSelectedOrderForReversal] =
    useState<SaleOrder | null>(null);
  const [orderReversalReason, setOrderReversalReason] = useState('');
  const [restoreInventoryOnOrderReversal, setRestoreInventoryOnOrderReversal] =
    useState(true);

  // Voucher reversal modal state
  const [selectedVoucherForReversal, setSelectedVoucherForReversal] =
    useState<Voucher | null>(null);
  const [voucherReversalReason, setVoucherReversalReason] = useState('');

  // Inventory adjustment state
  const [selectedInvId, setSelectedInvId] = useState<string>(
    inventory[0]?.id || ''
  );
  const [newStockInput, setNewStockInput] = useState<string>('');
  const [newCostMajorInput, setNewCostMajorInput] = useState<string>('');
  const [invAdjReason, setInvAdjReason] = useState<string>('');

  const allOrders = StorageService.getSaleOrders();
  const allVouchers = StorageService.getVouchers();
  const auditLogs: AuditCorrectionLog[] = StorageService.getAuditLogs();

  const selectedInvItem = useMemo(
    () => inventory.find((i) => i.id === selectedInvId) || null,
    [inventory, selectedInvId]
  );

  const handleSelectInvItem = (id: string) => {
    setSelectedInvId(id);
    const found = inventory.find((i) => i.id === id);
    if (found) {
      setNewStockInput(String(found.currentStock));
      setNewCostMajorInput(String(found.unitCost / 100));
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOrders;
    return allOrders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        o.cashierName.toLowerCase().includes(q)
    );
  }, [allOrders, searchQuery]);

  const filteredVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allVouchers;
    return allVouchers.filter(
      (v) =>
        v.voucherNumber.toLowerCase().includes(q) ||
        v.recipient.toLowerCase().includes(q) ||
        v.accountName.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [allVouchers, searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.correctionNumber.toLowerCase().includes(q) ||
        l.originalRecordNumber.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q) ||
        l.performedByName.toLowerCase().includes(q)
    );
  }, [auditLogs, searchQuery]);

  const handleConfirmOrderReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReversal) return;
    try {
      const log = StorageService.reverseSaleOrder({
        orderId: selectedOrderForReversal.id,
        reason: orderReversalReason,
        restoreInventory: restoreInventoryOnOrderReversal,
        performedByName: activeUser.name,
      });
      setFeedback({
        type: 'success',
        message: `تم إصدار القيد العكسي (${log.correctionNumber}) للفاتورة ${selectedOrderForReversal.orderNumber} بنجاح وتعديل الأرصدة والمخزون.`,
      });
      setSelectedOrderForReversal(null);
      setOrderReversalReason('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر عكس الفاتورة',
      });
    }
  };

  const handleConfirmVoucherReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucherForReversal) return;
    try {
      const log = StorageService.reverseVoucher({
        voucherId: selectedVoucherForReversal.id,
        reason: voucherReversalReason,
        performedByName: activeUser.name,
      });
      setFeedback({
        type: 'success',
        message: `تم إصدار سند القيد العكسي (${log.correctionNumber}) وإلغاء الأثر المالي للسند ${selectedVoucherForReversal.voucherNumber}.`,
      });
      setSelectedVoucherForReversal(null);
      setVoucherReversalReason('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر عكس السند',
      });
    }
  };

  const handleInventoryAuditedAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    const parsedStock = parseFloat(newStockInput);
    const parsedCostMajor = parseFloat(newCostMajorInput);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setFeedback({ type: 'error', message: 'يرجى إدخال كمية رصيد صحيحة' });
      return;
    }
    if (isNaN(parsedCostMajor) || parsedCostMajor < 0) {
      setFeedback({ type: 'error', message: 'يرجى إدخال تكلفة وحدة صحيحة' });
      return;
    }
    try {
      const log = StorageService.adjustInventoryWithAudit({
        itemId: selectedInvItem.id,
        newStock: parsedStock,
        newUnitCostMinor: Math.round(parsedCostMajor * 100),
        reason: invAdjReason,
        performedByName: activeUser.name,
      });
      setFeedback({
        type: 'success',
        message: `تم اعتماد التسوية الجردية (${log.correctionNumber}) للصنف «${selectedInvItem.name}» وإعادة احتساب تكاليف المنيو.`,
      });
      setInvAdjReason('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر حفظ التسوية',
      });
    }
  };

  const reversedOrdersCount = allOrders.filter((o) => o.isReversed).length;
  const reversedVouchersCount = allVouchers.filter((v) => v.isReversed).length;
  const totalReversedAmountMinor = auditLogs.reduce(
    (s, l) => s + l.amountMinor,
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Strip */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>نظام تصحيح الأخطاء والقيود العكسية المحاسبية</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                رقابة صارمة بدون حذف
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              تُعالج الأخطاء عبر إصدار قيود عكسية رسمية (Credit Notes / Reversal Vouchers) تُعيد المخزون وتصحح أرصدة الوردية والعملاء والموردين مع الاحتفاظ بالسجل الأصلي للمراجعة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 block">إجمالي القيود العكسية</span>
            <span className="text-sm font-black font-mono tabular-nums text-white">
              {auditLogs.length}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 block">فواتير / سندات معكوسة</span>
            <span className="text-sm font-black font-mono tabular-nums text-amber-400">
              {reversedOrdersCount} / {reversedVouchersCount}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 block">إجمالي القيم المصححة</span>
            <span className="text-sm font-black font-mono tabular-nums text-rose-400">
              {formatCurrency(totalReversedAmountMinor, currency)}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Sub-navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('orders')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'orders'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>عكس فواتير المبيعات ({allOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('vouchers')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'vouchers'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>عكس سندات الخزينة ({allVouchers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('inventory_adj');
              if (inventory[0] && !newStockInput) {
                handleSelectInvItem(inventory[0].id);
              }
            }}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'inventory_adj'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>تصحيح الجرد والتكلفة</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit_log')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'audit_log'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>السجل الرقابي للقيود العكسية ({auditLogs.length})</span>
          </button>
        </div>

        {subTab !== 'inventory_adj' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم المستند أو الاسم..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* SUB-TAB 1: SALE ORDERS REVERSAL */}
      {subTab === 'orders' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">رقم الفاتورة</th>
                  <th className="py-3 px-3 font-bold">التاريخ والوقت</th>
                  <th className="py-3 px-3 font-bold">الكاشير / العميل</th>
                  <th className="py-3 px-3 font-bold">طريقة الدفع</th>
                  <th className="py-3 px-3 font-bold">الأصناف</th>
                  <th className="py-3 px-3 font-bold">الإجمالي</th>
                  <th className="py-3 px-3 font-bold">الحالة المحاسبية</th>
                  <th className="py-3 px-3 font-bold text-left">إجراء التصحيح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      لا توجد فواتير مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        order.isReversed
                          ? 'bg-rose-950/15 opacity-75'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {order.date} · {order.time}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{order.cashierName}</div>
                        {order.customerName && (
                          <div className="text-[11px] text-sky-400">
                            العميل: {order.customerName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {getPaymentMethodLabel(order.paymentMethod)}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                        {order.lines.map((l) => `${l.qty}× ${l.menuItemName}`).join('، ')}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(order.totalAmount, currency)}
                      </td>
                      <td className="py-3 px-3">
                        {order.isReversed ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              معكوسة محاسبياً ({order.reversedBy})
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              السبب: {order.reversalReason}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            سارية ومعتمدة
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-left">
                        {!order.isReversed && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForReversal(order);
                              setOrderReversalReason('');
                              setRestoreInventoryOnOrderReversal(true);
                            }}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إصدار قيد عكسي</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TREASURY VOUCHERS REVERSAL */}
      {subTab === 'vouchers' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">رقم السند</th>
                  <th className="py-3 px-3 font-bold">التاريخ</th>
                  <th className="py-3 px-3 font-bold">نوع السند</th>
                  <th className="py-3 px-3 font-bold">الوعاء المالي</th>
                  <th className="py-3 px-3 font-bold">المستفيد والبيان</th>
                  <th className="py-3 px-3 font-bold">المبلغ</th>
                  <th className="py-3 px-3 font-bold">الحالة</th>
                  <th className="py-3 px-3 font-bold text-left">إجراء التصحيح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      لا توجد سندات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <tr
                      key={v.id}
                      className={`transition-colors ${
                        v.isReversed
                          ? 'bg-rose-950/15 opacity-75'
                          : v.reversesVoucherId
                          ? 'bg-amber-950/15'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {v.voucherNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {v.date} · {v.time}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {getVoucherTypeLabel(v.type)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {getFinancialContainerLabel(v.financialContainer)}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-white">{v.recipient}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {v.description}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-white">
                        {formatCurrency(v.amount, currency)}
                      </td>
                      <td className="py-3 px-3">
                        {v.isReversed ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            سند معكوس ({v.reversedBy})
                          </span>
                        ) : v.reversesVoucherId ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            قيد عكسي معتمد
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            ساري
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-left">
                        {!v.isReversed && !v.reversesVoucherId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoucherForReversal(v);
                              setVoucherReversalReason('');
                            }}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>عكس السند</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUDITED INVENTORY STOCK & COST CORRECTION */}
      {subTab === 'inventory_adj' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span>نموذج التسوية الجردية وتصحيح التكلفة</span>
            </h4>
            <form onSubmit={handleInventoryAuditedAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">
                  اختر الصنف من المخزن
                </label>
                <select
                  value={selectedInvId}
                  onChange={(e) => handleSelectInvItem(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-500"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} — الرصيد الحالي: {item.currentStock}{' '}
                      {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvItem && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      الرصيد الدفتري الحالي
                    </span>
                    <span className="text-sm font-black font-mono tabular-nums text-white">
                      {selectedInvItem.currentStock} {selectedInvItem.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      تكلفة الوحدة الحالية
                    </span>
                    <span className="text-sm font-black font-mono tabular-nums text-amber-400">
                      {formatCurrency(selectedInvItem.unitCost, currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الرصيد الفعلي الصحيح ({selectedInvItem?.unit || 'وحدة'})
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={newStockInput}
                    onChange={(e) => setNewStockInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    تكلفة الوحدة الصحيحة ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newCostMajorInput}
                    onChange={(e) => setNewCostMajorInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  سبب التسوية الجردية (إلزامي للسجل الرقابي)
                </label>
                <input
                  type="text"
                  required
                  value={invAdjReason}
                  onChange={(e) => setInvAdjReason(e.target.value)}
                  placeholder="مثال: مطابقة الجرد الفعلي نهاية الأسبوع / تصحيح فاتورة توريد..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-colors cursor-pointer"
              >
                اعتماد التسوية الجردية وتسجيل القيد الرقابي
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-sm font-black text-white mb-3">
              أحدث تسويات المخزون والتكاليف المسجلة
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">رقم القيد</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">البيان التفصيلي</th>
                    <th className="py-2.5 px-3">السبب</th>
                    <th className="py-2.5 px-3">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.filter((l) => l.targetType === 'inventory').length ===
                  0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        لم يتم إجراء تسويات جردية حتى الآن
                      </td>
                    </tr>
                  ) : (
                    auditLogs
                      .filter((l) => l.targetType === 'inventory')
                      .map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            {log.correctionNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                            {log.date} {log.time}
                          </td>
                          <td className="py-2.5 px-3 text-white">
                            {log.detailsSummary}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{log.reason}</td>
                          <td className="py-2.5 px-3 text-sky-300 font-bold">
                            {log.performedByName}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: IMMUTABLE AUDIT LOG */}
      {subTab === 'audit_log' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">رقم القيد العكسي</th>
                  <th className="py-3 px-3 font-bold">التاريخ والوقت</th>
                  <th className="py-3 px-3 font-bold">نوع العملية</th>
                  <th className="py-3 px-3 font-bold">المستند الأصلي</th>
                  <th className="py-3 px-3 font-bold">الأثر المالي</th>
                  <th className="py-3 px-3 font-bold">تفاصيل القيد والسبب</th>
                  <th className="py-3 px-3 font-bold">المنفذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      لا توجد قيود عكسية أو تصحيحات مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {log.correctionNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {log.date} · {log.time}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.targetType === 'sale_order'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : log.targetType === 'voucher'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {log.targetType === 'sale_order'
                            ? 'عكس فاتورة مبيعات'
                            : log.targetType === 'voucher'
                            ? 'عكس سند خزينة'
                            : 'تسوية مخزون وتكلفة'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {log.originalRecordNumber}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-rose-400">
                        {formatCurrency(log.amountMinor, currency)}
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <div className="text-white font-semibold">
                          {log.detailsSummary}
                        </div>
                        <div className="text-[11px] text-amber-300 mt-0.5">
                          السبب: {log.reason}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-sky-300">
                        {log.performedByName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM ORDER REVERSAL */}
      {selectedOrderForReversal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  إصدار قيد عكسي للفاتورة ({selectedOrderForReversal.orderNumber})
                </h4>
                <p className="text-[11px] text-slate-400">
                  القيمة الإجمالية:{' '}
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(selectedOrderForReversal.totalAmount, currency)}
                  </span>{' '}
                  · الدفع: {getPaymentMethodLabel(selectedOrderForReversal.paymentMethod)}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmOrderReversal} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreInventoryOnOrderReversal}
                    onChange={(e) =>
                      setRestoreInventoryOnOrderReversal(e.target.checked)
                    }
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      إعادة الخامات والأصناف المباعة تلقائياً إلى رصيد المخزن
                    </span>
                    <span className="text-[11px] text-slate-400">
                      قم بإلغاء التحديد فقط إذا تم تحضير الوجبة بالفعل وتلفت (تُحتسب هالك ولا تعود للمخزن).
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">
                  سبب القيد العكسي (اختر سبباً سريعاً أو اكتب التفاصيل):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'خطأ إدخال من الكاشير وإصدار فاتورة بديلة',
                    'إلغاء الطلب بناءً على رغبة العميل قبل الاستلام',
                    'تغيير طريقة الدفع من نقدي إلى إلكتروني / آجل',
                    'مرتجع أصناف لعدم المطابقة',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOrderReversalReason(preset)}
                      className="text-[10px] py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={orderReversalReason}
                  onChange={(e) => setOrderReversalReason(e.target.value)}
                  placeholder="اكتب السبب المحاسبي التفصيلي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl cursor-pointer"
                >
                  تأكيد القيد العكسي للفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForReversal(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM VOUCHER REVERSAL */}
      {selectedVoucherForReversal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  إصدار قيد عكسي للسند ({selectedVoucherForReversal.voucherNumber})
                </h4>
                <p className="text-[11px] text-slate-400">
                  المبلغ:{' '}
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(selectedVoucherForReversal.amount, currency)}
                  </span>{' '}
                  · المستفيد: {selectedVoucherForReversal.recipient}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmVoucherReversal} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 leading-relaxed">
                سيقوم النظام بإصدار سند عكسي مقابل بنفس القيمة على وعاء «
                {getFinancialContainerLabel(
                  selectedVoucherForReversal.financialContainer
                )}
                » وإعادة رصيد الطرف المرتبط (مورد / عميل / شريك / موظف) إلى وضعه الصحيح قبل السند.
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">
                  سبب عكس السند:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'خطأ في إدخال المبلغ أو اسم المستفيد',
                    'اختيار وعاء مالي خاطئ (الدرج بدلاً من الخزينة)',
                    'تكرار تسجيل السند بالخطأ',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setVoucherReversalReason(preset)}
                      className="text-[10px] py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={voucherReversalReason}
                  onChange={(e) => setVoucherReversalReason(e.target.value)}
                  placeholder="اكتب سبب القيد العكسي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl cursor-pointer"
                >
                  تأكيد إصدار السند العكسي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucherForReversal(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
