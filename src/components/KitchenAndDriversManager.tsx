import React, { useState } from 'react';
import { DeliveryDriver, KitchenStation, RestaurantSettings, Shift } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  Flame,
  HandCoins,
  Layers,
  Phone,
  Plus,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  X,
} from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  activeShift?: Shift | null;
  onRefresh: () => void;
}

export const KitchenAndDriversManager: React.FC<Props> = ({
  settings,
  activeShift,
  onRefresh,
}) => {
  const [kitchenStations, setKitchenStations] = useState<KitchenStation[]>(() =>
    StorageService.getKitchenStations()
  );
  const [drivers, setDrivers] = useState<DeliveryDriver[]>(() =>
    StorageService.getDeliveryDrivers()
  );

  // New Driver Form state
  const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'car' | 'on_foot'>(
    'motorcycle'
  );
  const [driverNotes, setDriverNotes] = useState<string>('');

  // Settle Custody Modal state
  const [settlingDriver, setSettlingDriver] = useState<DeliveryDriver | null>(null);
  const [settleAmountStr, setSettleAmountStr] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settleError, setSettleError] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');

  const refreshLocal = () => {
    setKitchenStations(StorageService.getKitchenStations());
    setDrivers(StorageService.getDeliveryDrivers());
    onRefresh();
  };

  const handleToggleStation = (stationId: string) => {
    StorageService.toggleKitchenStation(stationId);
    refreshLocal();
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !driverPhone.trim()) return;

    StorageService.addDeliveryDriver({
      name: driverName.trim(),
      phone: driverPhone.trim(),
      vehicleType,
      notes: driverNotes.trim() || undefined,
    });

    setShowAddDriverModal(false);
    setDriverName('');
    setDriverPhone('');
    setDriverNotes('');
    setSuccessBanner('تم تسجيل الطيار بنجاح وإضافته لقائمة التوصيل السريع.');
    setTimeout(() => setSuccessBanner(''), 4000);
    refreshLocal();
  };

  const handleOpenSettle = (driver: DeliveryDriver) => {
    setSettlingDriver(driver);
    setSettleAmountStr((driver.cashInCustodyMinor / 100).toFixed(2));
    setSettleNotes('');
    setSettleError('');
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingDriver) return;
    const amountVal = parseFloat(settleAmountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      setSettleError('يرجى إدخال مبلغ صحيح للتوريد');
      return;
    }
    const amountMinor = Math.round(amountVal * 100);
    if (amountMinor > settlingDriver.cashInCustodyMinor) {
      setSettleError(
        `المبلغ أكبر من إجمالي النقدية في عهدة الطيار (${formatCurrency(
          settlingDriver.cashInCustodyMinor,
          settings.currency
        )})`
      );
      return;
    }

    try {
      StorageService.settleDriverCash({
        driverId: settlingDriver.id,
        settledAmountMinor: amountMinor,
        shiftId: activeShift ? activeShift.id : 'shift-admin',
        cashierName: activeShift ? activeShift.cashierName : 'أمين الخزينة الرئيسي',
        notes: settleNotes.trim() || undefined,
      });

      setSettlingDriver(null);
      setSuccessBanner(
        `تم توريد مبلغ ${formatCurrency(
          amountMinor,
          settings.currency
        )} بنجاح من الطيار ${settlingDriver.name} وإيداعه بالخزينة.`
      );
      setTimeout(() => setSuccessBanner(''), 5000);
      refreshLocal();
    } catch (err: unknown) {
      setSettleError(err instanceof Error ? err.message : 'حدث خطأ أثناء التوريد');
    }
  };

  const totalDriverCustodyMinor = drivers.reduce((s, d) => s + (d.cashInCustodyMinor || 0), 0);
  const totalActiveDeliveryOrders = drivers.reduce((s, d) => s + (d.currentOrdersCount || 0), 0);

  return (
    <div className="space-y-6 text-slate-100">
      {successBanner && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* TOP STATS KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>أقسام المطبخ النشطة</span>
            <ChefHat className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {kitchenStations.filter((s) => s.isActive).length} / {kitchenStations.length}
          </div>
          <span className="text-[11px] text-slate-500">توجيه فوري لبونات KOT حسب القسم</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>الطيارين والطلبات الجارية</span>
            <Bike className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {totalActiveDeliveryOrders} <span className="text-xs text-slate-400 font-sans">طلب جارٍ</span>
          </div>
          <span className="text-[11px] text-slate-500">
            لدى {drivers.filter((d) => d.isActive).length} طيار نشط
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>إجمالي النقدية المعلقة بعهدة الطيارين</span>
            <HandCoins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatCurrency(totalDriverCustodyMinor, settings.currency)}
          </div>
          <span className="text-[11px] text-slate-500">مطلوب توريدها لخزينة الكاشير</span>
        </div>
      </div>

      {/* SECTION 1: KITCHEN DEPARTMENTS & STATIONS */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                أقسام وتوجيه المطبخ (Kitchen Stations & Routing)
              </h3>
              <p className="text-xs text-slate-400">
                تقسيم خط الإنتاج وطباعة بونات KOT لكل قسم على حدة (مشويات، فرن، شاورما، كافيه، سلطات)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {kitchenStations.map((station) => (
            <div
              key={station.id}
              className={`p-4 rounded-2xl border transition-all ${
                station.isActive
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-950/60 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                  {station.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleStation(station.id)}
                  className="text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="تفعيل / تعطيل القسم"
                >
                  {station.isActive ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ToggleRight className="w-5 h-5" />
                      <span>نشط</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <ToggleLeft className="w-5 h-5" />
                      <span>معطل</span>
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Flame className={`w-4 h-4 ${station.colorBadge || 'text-amber-400'}`} />
                <h4 className="text-sm font-black text-white">{station.name}</h4>
              </div>

              <p className="text-[11px] text-slate-400">
                يتم توجيه عناصر المنيو المندرجة تحت هذا القسم تلقائياً إلى بون KOT المخصص.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: DELIVERY DRIVERS & CASH CUSTODY */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                طيارين التوصيل ومتابعة العهدة النقدية (Delivery Fleet & Driver Custody)
              </h3>
              <p className="text-xs text-slate-400">
                إدارة مناديب التوصيل، متابعة الأوردرات المسندة لكل طيار، وتوريد النقدية المحصلة لخزينة المحل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddDriverModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ تسجيل طيار جديد</span>
          </button>
        </div>

        {drivers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <Bike className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-bold text-slate-400">لا يوجد طيارين مسجلين في النظام حالياً</p>
            <p>اضغط على &quot;تسجيل طيار جديد&quot; لبدء إسناد طلبات الدليفري وتتبع عهدة التحصيل</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">الكود</th>
                  <th className="py-3 px-3">الطيار</th>
                  <th className="py-3 px-3">الهاتف</th>
                  <th className="py-3 px-3">وسيلة الانتقال</th>
                  <th className="py-3 px-3">الطلبات الجارية</th>
                  <th className="py-3 px-3">إجمالي المسلّم</th>
                  <th className="py-3 px-3">العهدة النقدية المعلقة</th>
                  <th className="py-3 px-3 text-left">إجراء التوريد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {drivers.map((drv) => (
                  <tr key={drv.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-sky-400">{drv.code}</td>
                    <td className="py-3 px-3 font-black text-white">{drv.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {drv.phone}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
                        {drv.vehicleType === 'motorcycle'
                          ? '🛵 موتوسيكل'
                          : drv.vehicleType === 'bicycle'
                          ? '🚲 دراجة'
                          : drv.vehicleType === 'car'
                          ? '🚗 سيارة'
                          : '🚶 على الأقدام'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          drv.currentOrdersCount > 0
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {drv.currentOrdersCount} طلبات
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {drv.totalDeliveredCount || 0} أوردر
                    </td>
                    <td className="py-3 px-3">
                      <strong
                        className={`font-mono text-sm font-black ${
                          drv.cashInCustodyMinor > 0 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(drv.cashInCustodyMinor, settings.currency)}
                      </strong>
                    </td>
                    <td className="py-3 px-3 text-left">
                      <button
                        type="button"
                        disabled={drv.cashInCustodyMinor <= 0}
                        onClick={() => handleOpenSettle(drv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-300 hover:text-slate-950 border border-emerald-500/30 rounded-xl font-bold transition-all cursor-pointer"
                        title="توريد نقدية تحصيل الأوردرات لخزينة الكاشير"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>توريد العهدة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD DELIVERY DRIVER */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-sky-400" />
                <h4 className="text-sm font-black text-white">تسجيل طيار توصيل جديد</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الطيار: *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="مثال: محمود عاشور"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">رقم الهاتف للتواصل: *</label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">وسيلة الانتقال:</label>
                <select
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(e.target.value as 'motorcycle' | 'bicycle' | 'car' | 'on_foot')
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                >
                  <option value="motorcycle">🛵 دراجة نارية (موتوسيكل / سكوتر)</option>
                  <option value="bicycle">🚲 عجلة / دراجة هوائية</option>
                  <option value="car">🚗 سيارة خاصة</option>
                  <option value="on_foot">🚶 على الأقدام (للمنطقة المحيطة)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات إضافية:</label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="مثال: متفرغ وردية مسائية فقط..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  حفظ وتسجيل الطيار
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTLE DRIVER CASH CUSTODY */}
      {settlingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    تصفية وتوريد عهدة نقدية: {settlingDriver.name}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    إنشاء سند قبض نقدية رسمي وتوريد المبلغ لخزينة الكاشير
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingDriver(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>إجمالي العهدة النقدية المعلقة مع الطيار:</span>
                <strong className="font-mono text-emerald-400 text-sm">
                  {formatCurrency(settlingDriver.cashInCustodyMinor, settings.currency)}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>الطلبات التي تم تحصيلها:</span>
                <span className="font-mono font-bold text-white">
                  {settlingDriver.currentOrdersCount} طلبات
                </span>
              </div>
            </div>

            {settleError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                {settleError}
              </div>
            )}

            <form onSubmit={handleConfirmSettle} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  المبلغ المورد نقداً لخزينة المحل ({settings.currency}): *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.1"
                  value={settleAmountStr}
                  onChange={(e) => setSettleAmountStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات التوريد:</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="مثال: توريد نقدية أوردرات الغداء بالكامل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  تأكيد استلام النقدية وإصدار السند
                </button>
                <button
                  type="button"
                  onClick={() => setSettlingDriver(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
