import React, { useMemo, useState } from 'react';
import {
  InventoryItem,
  RestaurantSettings,
  ServiceTicket,
} from '../types';
import { formatCurrency } from '../services/storage';
import {
  Barcode,
  Calendar,
  CheckCircle2,
  FileText,
  Layers,
  Printer,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Wrench,
  X,
} from 'lucide-react';

/**
 * Generates deterministic high-contrast SVG bar widths from any string (Code-128 visual representation)
 */
export const RenderVisualBarcode: React.FC<{
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}> = ({ value, height = 38, showText = true, className = '' }) => {
  const cleanVal = (value || '100000').trim();

  const bars = useMemo(() => {
    const pattern: number[] = [2, 1, 1, 2]; // Start guard
    for (let i = 0; i < cleanVal.length; i++) {
      const code = cleanVal.charCodeAt(i);
      const b1 = (code % 3) + 1;
      const s1 = ((code >> 2) % 2) + 1;
      const b2 = ((code >> 3) % 3) + 1;
      const s2 = ((code >> 5) % 2) + 1;
      pattern.push(b1, s1, b2, s2);
    }
    pattern.push(2, 1, 2, 1, 2); // Stop guard
    return pattern;
  }, [cleanVal]);

  const totalUnits = bars.reduce((acc, w) => acc + w, 0);

  let currentX = 0;
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalUnits} ${height}`}
        className="w-full max-w-[230px] bg-white px-2 py-1"
        style={{ height: `${height}px` }}
        preserveAspectRatio="none"
      >
        {bars.map((w, idx) => {
          const x = currentX;
          currentX += w;
          const isBar = idx % 2 === 0;
          if (!isBar) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={w}
              height={height}
              fill="#000000"
            />
          );
        })}
      </svg>
      {showText && (
        <div
          dir="ltr"
          className="font-mono text-[11px] font-black tracking-widest text-black mt-0.5 text-center"
        >
          *{cleanVal}*
        </div>
      )}
    </div>
  );
};

interface TicketPrintModalProps {
  ticket: ServiceTicket;
  settings: RestaurantSettings;
  onClose: () => void;
}

export const ServiceTicketPrintModal: React.FC<TicketPrintModalProps> = ({
  ticket,
  settings,
  onClose,
}) => {
  const [layout, setLayout] = useState<'thermal_80mm' | 'tag_sticker' | 'a4_sheet'>(
    'thermal_80mm'
  );

  const remainingMinor = Math.max(
    0,
    ticket.totalAmountMinor - ticket.depositPaidMinor
  );

  const partsTotalMinor = (ticket.partsUsed || []).reduce(
    (s, p) => s + p.unitPriceMinor * p.qty,
    0
  );

  const ticketTitleLabel =
    ticket.ticketType === 'repair'
      ? 'إيصال استلام جهاز للصيانة والفحص'
      : ticket.ticketType === 'appointment'
      ? 'بطاقة تأكيد حجز جلسة / باقة عناية'
      : 'إيصال استلام ملابس — مغسلة ودراي كلين';

  const statusLabel =
    ticket.status === 'received'
      ? 'مستلم بالفرع'
      : ticket.status === 'in_progress'
      ? 'قيد التنفيذ والتجهيز'
      : ticket.status === 'ready'
      ? 'جاهز للتسليم للعميل'
      : ticket.status === 'delivered'
      ? 'تم التسليم للعميل'
      : 'ملغي';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                معاينة وطباعة إيصال الاستلام / التاج ({ticket.ticketNumber})
              </h3>
              <p className="text-xs text-slate-400">
                اختر مقاس الطباعة الحرارية (80mm أو ملصق التاج أو A4) ثم اضغط طباعة فورية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setLayout('thermal_80mm')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layout === 'thermal_80mm'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>إيصال رول 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout('tag_sticker')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layout === 'tag_sticker'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>ملصق تاج الجهاز/الملابس</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout('a4_sheet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layout === 'a4_sheet'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>شهادة استلام وضمان A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Canvas Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80 flex justify-center items-start">
          <div
            id="printable-voucher"
            dir="rtl"
            className={`bg-white text-black shadow-2xl transition-all ${
              layout === 'thermal_80mm'
                ? 'w-[310px] p-4 rounded-xl border border-slate-300'
                : layout === 'tag_sticker'
                ? 'w-[250px] p-3 rounded-xl border-2 border-dashed border-black'
                : 'w-full max-w-[740px] p-8 rounded-xl border border-slate-300'
            }`}
          >
            {layout === 'tag_sticker' ? (
              /* COMPACT TAG / DEVICE STICKER (50x30mm style) */
              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-between border-b-2 border-black pb-1">
                  <span className="text-[11px] font-black">{settings.restaurantName}</span>
                  <span className="text-xs font-mono font-black bg-black text-white px-1.5 py-0.5 rounded">
                    {ticket.ticketNumber}
                  </span>
                </div>
                <div className="text-xs font-black truncate">
                  {ticket.customerName} {ticket.customerPhone ? `(${ticket.customerPhone})` : ''}
                </div>
                <div className="text-[11px] font-bold border border-black rounded p-1">
                  {ticket.itemOrServiceTitle}
                </div>
                {ticket.serialOrTagNumber && (
                  <div className="text-[11px] font-mono font-black">
                    المعرف / التاج: {ticket.serialOrTagNumber}
                  </div>
                )}
                <div className="text-[10px] font-bold">
                  التسليم: {ticket.appointmentDate} ({ticket.appointmentTime})
                </div>
                <RenderVisualBarcode value={ticket.ticketNumber} height={28} />
              </div>
            ) : (
              /* THERMAL 80MM OR A4 CLAIM RECEIPT */
              <div className="space-y-3">
                {/* Business Header */}
                <div className="text-center border-b-2 border-black pb-3">
                  <h1
                    className={`font-black tracking-tight ${
                      layout === 'a4_sheet' ? 'text-2xl' : 'text-lg'
                    }`}
                  >
                    {settings.restaurantName}
                  </h1>
                  <p className="text-xs font-bold text-neutral-700">
                    {settings.branchName} — {settings.address}
                  </p>
                  {settings.phone && (
                    <p className="text-xs font-mono font-bold mt-0.5">
                      هاتف: {settings.phone}
                    </p>
                  )}
                  <div className="mt-2 inline-block border-2 border-black px-3 py-1 rounded-lg font-black text-xs">
                    {ticketTitleLabel}
                  </div>
                </div>

                {/* Ticket Number & Barcode Box */}
                <div className="border-2 border-black rounded-xl p-2.5 text-center bg-neutral-50">
                  <div className="text-[11px] font-bold text-neutral-600">
                    رقم التذكرة / الحجز المرجعي
                  </div>
                  <div className="text-2xl font-mono font-black tracking-wider my-0.5">
                    {ticket.ticketNumber}
                  </div>
                  <RenderVisualBarcode value={ticket.ticketNumber} height={34} />
                </div>

                {/* Customer & Metadata Grid */}
                <div
                  className={`grid gap-2 text-xs border border-black rounded-xl p-3 ${
                    layout === 'a4_sheet' ? 'grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  <div className="flex justify-between border-b border-dashed border-neutral-300 pb-1">
                    <span className="font-bold text-neutral-600">اسم العميل:</span>
                    <span className="font-black">{ticket.customerName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-neutral-300 pb-1">
                    <span className="font-bold text-neutral-600">رقم الهاتف:</span>
                    <span className="font-mono font-black">
                      {ticket.customerPhone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-neutral-300 pb-1">
                    <span className="font-bold text-neutral-600">تاريخ الاستلام:</span>
                    <span className="font-mono font-bold">{ticket.createdAt}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-neutral-300 pb-1">
                    <span className="font-bold text-neutral-600">موعد التسليم / الجلسة:</span>
                    <span className="font-mono font-black">
                      {ticket.appointmentDate} · {ticket.appointmentTime}
                    </span>
                  </div>
                  {ticket.serialOrTagNumber && (
                    <div className="flex justify-between border-b border-dashed border-neutral-300 pb-1">
                      <span className="font-bold text-neutral-600">
                        {ticket.ticketType === 'repair'
                          ? 'رقم السيريال (IMEI):'
                          : ticket.ticketType === 'appointment'
                          ? 'الغرفة / الكرسي:'
                          : 'رقم التاج والشماعة:'}
                      </span>
                      <span className="font-mono font-black">
                        {ticket.serialOrTagNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-bold text-neutral-600">الفني / الأخصائي:</span>
                    <span className="font-black">
                      {ticket.assignedEmployeeName || 'القسم المختص'}
                    </span>
                  </div>
                </div>

                {/* Service / Item Details */}
                <div className="border-2 border-black rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-bold text-neutral-600">
                    {ticket.ticketType === 'repair'
                      ? 'بيان الجهاز ونوع الصيانة المطلوبة:'
                      : ticket.ticketType === 'appointment'
                      ? 'بيان الجلسة / الباقة المحجوزة:'
                      : 'بيان الملابس والقطع المستلمة:'}
                  </div>
                  <div className="text-sm font-black">
                    {ticket.itemOrServiceTitle}
                  </div>
                  {ticket.problemOrNotes && (
                    <div className="text-xs border-t border-dashed border-neutral-400 pt-1.5 mt-1">
                      <span className="font-bold">ملاحظات الفحص / العميل: </span>
                      <span>{ticket.problemOrNotes}</span>
                    </div>
                  )}
                  {ticket.packageRemainingSessions !== undefined && (
                    <div className="mt-1.5 p-1.5 border border-black rounded font-black text-xs text-center">
                      رصيد جلسات الباقة المتبقي للعميل: {ticket.packageRemainingSessions} جلسات
                    </div>
                  )}
                </div>

                {/* Spare Parts Table if used */}
                {ticket.partsUsed && ticket.partsUsed.length > 0 && (
                  <div className="border border-black rounded-xl overflow-hidden text-xs">
                    <div className="bg-black text-white font-black px-3 py-1.5">
                      قطع الغيار والمستلزمات المضافة
                    </div>
                    <table className="w-full text-right">
                      <thead className="border-b border-black bg-neutral-100">
                        <tr>
                          <th className="py-1 px-2">الصنف / القطعة</th>
                          <th className="py-1 px-2">الكمية</th>
                          <th className="py-1 px-2 text-left">القيمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticket.partsUsed.map((p, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="py-1 px-2 font-bold">{p.itemName}</td>
                            <td className="py-1 px-2 font-mono">{p.qty}</td>
                            <td className="py-1 px-2 font-mono font-bold text-left">
                              {formatCurrency(p.unitPriceMinor * p.qty, settings.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Financial Summary Box */}
                <div className="border-2 border-black rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold">قيمة الخدمة / المصنعية:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(ticket.serviceFeeMinor, settings.currency)}
                    </span>
                  </div>
                  {partsTotalMinor > 0 && (
                    <div className="flex justify-between">
                      <span className="font-bold">إجمالي قطع الغيار:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(partsTotalMinor, settings.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-1 font-black">
                    <span>الإجمالي الكلي للتذكرة:</span>
                    <span className="font-mono">
                      {formatCurrency(ticket.totalAmountMinor, settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-700">
                    <span className="font-bold">العربون المدفوع مقدماً:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(ticket.depositPaidMinor, settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t-2 border-black pt-1.5 text-sm font-black">
                    <span>صافي المتبقي عند الاستلام:</span>
                    <span className="font-mono text-base">
                      {ticket.isSettled
                        ? 'خالص (مسدد بالكامل)'
                        : formatCurrency(remainingMinor, settings.currency)}
                    </span>
                  </div>
                </div>

                {/* Terms & Signatures */}
                <div className="pt-2 border-t border-dashed border-black text-[10px] leading-relaxed space-y-1 text-center">
                  <p className="font-bold">
                    • يعتبر هذا الإيصال مستنداً رسمياً لاستلام الجهاز / القطع ولا يتم التسليم إلا بموجبه.
                  </p>
                  <p>
                    • المحل غير مسؤول عن الأجهزة أو الملابس التي لا يتم استلامها خلال 30 يوماً من تاريخ الموعد المحدد.
                  </p>
                  <p className="font-mono text-[9px] pt-1">
                    الحالة الحالية: {statusLabel}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BarcodeStickerStudioProps {
  inventory: InventoryItem[];
  settings: RestaurantSettings;
  initialItemId?: string;
  onClose?: () => void;
}

export const BarcodeStickerStudio: React.FC<BarcodeStickerStudioProps> = ({
  inventory,
  settings,
  initialItemId,
  onClose,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId || inventory[0]?.id || ''
  );

  const selectedItem = useMemo(
    () => inventory.find((i) => i.id === selectedItemId) || inventory[0] || null,
    [inventory, selectedItemId]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [scaleWeightGrams, setScaleWeightGrams] = useState<string>('500');
  const [copiesCount, setCopiesCount] = useState<number>(6);
  const [stickerLayout, setStickerLayout] = useState<
    'single_50x25' | 'single_40x30' | 'sheet_a4_grid'
  >('sheet_a4_grid');

  const [showShopName, setShowShopName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMetaBadge, setShowMetaBadge] = useState<boolean>(true);

  const activeVariant = useMemo(() => {
    if (!selectedItem?.variants || !selectedVariantId) return null;
    return (
      selectedItem.variants.find((v) => v.id === selectedVariantId) ||
      null
    );
  }, [selectedItem, selectedVariantId]);

  // Compute the effective barcode string (supports Standard Barcode, IMEI Serial, or Scale PLU 21PPPPPWWRRRR)
  const effectiveBarcodeValue = useMemo(() => {
    if (!selectedItem) return '100000';
    if (selectedSerial.trim()) {
      return selectedSerial.trim();
    }
    if (selectedItem.isWeightedScaleItem && selectedItem.scalePluCode) {
      const plu5 = selectedItem.scalePluCode.padStart(5, '0').slice(0, 5);
      const grams = Math.max(1, Math.min(99999, parseInt(scaleWeightGrams, 10) || 500));
      const weight5 = String(grams).padStart(5, '0');
      return `21${plu5}${weight5}9`;
    }
    if (activeVariant?.barcode) {
      return activeVariant.barcode;
    }
    return selectedItem.barcode || selectedItem.code || '100000';
  }, [selectedItem, selectedSerial, scaleWeightGrams, activeVariant]);

  // Compute effective price to display on the label
  const effectivePriceMinor = useMemo(() => {
    if (!selectedItem) return 0;
    const basePrice = selectedItem.salePrice || selectedItem.unitCost;
    if (selectedItem.isWeightedScaleItem) {
      const grams = Math.max(1, parseInt(scaleWeightGrams, 10) || 500);
      return Math.round((basePrice * grams) / 1000);
    }
    return basePrice;
  }, [selectedItem, scaleWeightGrams]);

  const copiesArray = useMemo(
    () => Array.from({ length: Math.max(1, Math.min(48, copiesCount)) }),
    [copiesCount]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
      {/* Studio Controls Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">
              استوديو تصميم وطباعة ملصقات الباركود والتسعير والميزان والسيريال
            </h4>
            <p className="text-[11px] text-slate-400">
              يدعم ملصقات الباركود الحرارية (50×25 مم)، ملصقات الملابس بالمقاس واللون، باركود الميزان (21)، وسيريال IMEI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصقات الآن ({copiesCount} ملصق)</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sticker Configurator (No Print) */}
        <div className="no-print lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-bold">
              1. اختر الصنف من المخزن لطباعة الباركود:
            </label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setSelectedVariantId('');
                setSelectedSerial('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold"
            >
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {item.name} —{' '}
                  {formatCurrency(item.salePrice || item.unitCost, settings.currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Apparel Size/Color Selector */}
          {selectedItem?.variants &&
            selectedItem.variants.length > 0 && (
              <div>
                <label className="block text-pink-300 mb-1 font-bold">
                  تخصيص المقاس واللون على الملصق (ملابس وأحذية):
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full bg-slate-950 border border-pink-500/40 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">— بدون تحديد مقاس/لون —</option>
                  {selectedItem.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      مقاس {v.size} — لون {v.color} (الرصيد: {v.stock})
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Optional Electronics Serial / IMEI Selector */}
          {selectedItem?.serialNumbers &&
            selectedItem.serialNumbers.length > 0 && (
              <div>
                <label className="block text-amber-300 mb-1 font-bold">
                  تخصيص سيريال الجهاز (IMEI) لطباعته كباركود:
                </label>
                <select
                  value={selectedSerial}
                  onChange={(e) => setSelectedSerial(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono"
                >
                  <option value="">— طباعة باركود الصنف العام —</option>
                  {selectedItem.serialNumbers.map((sn) => (
                    <option key={sn} value={sn}>
                      {sn}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Optional Weighted Scale Barcode Generator (21PPPPPWWRRRR) */}
          {selectedItem?.isWeightedScaleItem && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-2">
              <div className="font-bold text-sky-300">
                ⚖️ مولد باركود الميزان الذكي (PLU: {selectedItem.scalePluCode || '10101'})
              </div>
              <div className="flex items-center gap-2">
                <span>الوزن بالجرام على الملصق:</span>
                <input
                  type="number"
                  min="10"
                  max="99999"
                  step="50"
                  value={scaleWeightGrams}
                  onChange={(e) => setScaleWeightGrams(e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono font-bold text-center"
                />
                <span className="text-slate-400">جم</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[250, 500, 750, 1000, 1500].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setScaleWeightGrams(String(g))}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                      Number(scaleWeightGrams) === g
                        ? 'bg-sky-500 text-slate-950 font-black border-sky-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {g} جم
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker Size / Format */}
          <div>
            <label className="block text-slate-300 mb-1 font-bold">
              2. مقاس وتخطيط ورق الملصقات:
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  id: 'sheet_a4_grid',
                  label: '📄 فرخ ملصقات متعدد (A4 Sheet — 3 أعمدة)',
                },
                {
                  id: 'single_50x25',
                  label: '🏷️ ملصق حراري مفرد قياسي (50×25 مم - Zebra/Xprinter)',
                },
                {
                  id: 'single_40x30',
                  label: '🛡️ ملصق مفصل بالضمان / الصلاحية (40×30 مم)',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setStickerLayout(
                      opt.id as 'single_50x25' | 'single_40x30' | 'sheet_a4_grid'
                    )
                  }
                  className={`py-2 px-3 rounded-xl font-bold text-right border transition-all cursor-pointer ${
                    stickerLayout === opt.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copies Count */}
          <div>
            <label className="block text-slate-300 mb-1 font-bold">
              3. عدد الملصقات المطلوب طباعتها:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="48"
                value={copiesCount}
                onChange={(e) =>
                  setCopiesCount(Math.max(1, Math.min(48, Number(e.target.value) || 1)))
                }
                className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-black text-center"
              />
              <div className="flex flex-wrap gap-1">
                {[1, 3, 6, 12, 24].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCopiesCount(cnt)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono font-bold cursor-pointer border ${
                      copiesCount === cnt
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Toggles */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showShopName}
                onChange={(e) => setShowShopName(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-300">إظهار اسم النشاط التجاري أعلى الملصق</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-300">إظهار سعر البيع بخط عريض</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMetaBadge}
                onChange={(e) => setShowMetaBadge(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-300">
                إظهار المقاس/اللون أو الضمان أو الصلاحية
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Live Printable Barcode Sheet (#printable-voucher) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-[620px]">
          <div className="no-print flex items-center justify-between mb-3 text-xs text-slate-400">
            <span>معاينة حية للملصقات قبل الطباعة ({copiesArray.length} ملصق):</span>
            <span className="font-mono text-amber-400">
              Barcode: {effectiveBarcodeValue}
            </span>
          </div>

          <div
            id="printable-voucher"
            dir="rtl"
            className={`bg-white text-black p-3 rounded-xl mx-auto ${
              stickerLayout === 'sheet_a4_grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-[680px]'
                : 'flex flex-col items-center gap-3 max-w-[240px]'
            }`}
          >
            {selectedItem &&
              copiesArray.map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black rounded-lg p-2 flex flex-col items-center justify-between text-center bg-white break-inside-avoid"
                >
                  {showShopName && (
                    <div className="text-[10px] font-black tracking-tight border-b border-black w-full pb-0.5 mb-1 truncate">
                      {settings.restaurantName}
                    </div>
                  )}

                  <div className="text-[11px] font-black leading-tight line-clamp-1 w-full">
                    {selectedItem.name}
                  </div>

                  {showMetaBadge && (
                    <div className="text-[9px] font-bold text-neutral-800 mt-0.5">
                      {activeVariant
                        ? `مقاس: ${activeVariant.size} | لون: ${activeVariant.color}`
                        : selectedSerial
                        ? `S/N: ${selectedSerial}`
                        : selectedItem.isWeightedScaleItem
                        ? `الوزن الصافي: ${scaleWeightGrams} جم`
                        : selectedItem.expiryDate
                        ? `صلاحية: ${selectedItem.expiryDate}`
                        : selectedItem.warrantyMonths
                        ? `ضمان معتمد: ${selectedItem.warrantyMonths} شهر`
                        : `كود: ${selectedItem.code}`}
                    </div>
                  )}

                  <div className="my-1 w-full">
                    <RenderVisualBarcode
                      value={effectiveBarcodeValue}
                      height={stickerLayout === 'single_50x25' ? 28 : 34}
                    />
                  </div>

                  {showPrice && (
                    <div className="w-full border-t border-black pt-0.5 flex items-center justify-center gap-1">
                      <span className="text-[10px] font-bold">السعر:</span>
                      <span className="font-mono text-xs font-black">
                        {formatCurrency(effectivePriceMinor, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
