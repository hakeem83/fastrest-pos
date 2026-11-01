import React, { useState } from 'react';
import { MenuItem, Promotion, PromotionType } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import {
  CheckCircle2,
  Gift,
  Plus,
  Power,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';

interface Props {
  currency: string;
  menuItems: MenuItem[];
  onRefresh: () => void;
}

export const PromotionsManager: React.FC<Props> = ({
  currency,
  menuItems,
  onRefresh,
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>(() =>
    StorageService.getPromotions()
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('percentage');
  const [discountValStr, setDiscountValStr] = useState('15');
  const [minOrderStr, setMinOrderStr] = useState('150');
  const [maxCapStr, setMaxCapStr] = useState('50');
  const [badge, setBadge] = useState('عرض جديد');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [bogoBuyQty, setBogoBuyQty] = useState('2');
  const [bogoGetQty, setBogoGetQty] = useState('1');
  const [bogoPercent, setBogoPercent] = useState('100');
  const [applicableCat, setApplicableCat] = useState('all');
  const [formError, setFormError] = useState('');

  const reload = () => {
    setPromotions(StorageService.getPromotions());
    onRefresh();
  };

  const handleToggleActive = (id: string) => {
    StorageService.togglePromotionActive(id);
    reload();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العرض التسويقي؟')) {
      StorageService.deletePromotion(id);
      reload();
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!code.trim() || !title.trim()) {
      setFormError('يرجى كتابة كود الكوبون وعنوان العرض.');
      return;
    }

    const val = parseFloat(discountValStr) || 0;
    const minOrderVal = parseFloat(minOrderStr) || 0;
    const maxCapVal = parseFloat(maxCapStr) || 0;

    const discountValue =
      type === 'fixed_amount' ? Math.round(val * 100) : val;

    StorageService.addPromotion({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || `عرض ${title.trim()}`,
      type,
      discountValue,
      minOrderAmount: Math.round(minOrderVal * 100),
      maxDiscountCap: maxCapVal > 0 ? Math.round(maxCapVal * 100) : undefined,
      applicableMenuItemId: selectedMealId || undefined,
      applicableCategory: applicableCat !== 'all' ? applicableCat : undefined,
      bogoBuyQty: parseInt(bogoBuyQty) || 2,
      bogoGetQty: parseInt(bogoGetQty) || 1,
      bogoDiscountPercent: parseInt(bogoPercent) || 100,
      isActive: true,
      badge: badge.trim() || undefined,
    });

    // Reset Form
    setCode('');
    setTitle('');
    setDescription('');
    setShowAddForm(false);
    reload();
  };

  const categories = Array.from(
    new Set(menuItems.map((m) => m.category).filter(Boolean))
  );

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              محرك العروض الترويجية والكوبونات للمطعم
            </h3>
            <p className="text-[11px] text-slate-400">
              إدارة حملات الخصم التسويقية، عروض الـ BOGO، وكوبونات التوفير للمبيعات
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'إلغاء' : 'إضافة عرض / كوبون جديد'}</span>
        </button>
      </div>

      {/* Add New Promotion Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-white text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              تكوين عرض تسويقي جديد
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              سيظهر فورياً للكاشير وفي التقارير
            </span>
          </div>

          {formError && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl font-bold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                كود الكوبون التسويقي: *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="مثال: SAVE25"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-hidden focus:border-amber-500 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1">
                عنوان العرض الترويجي: *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: خصم 25% على جميع الوجبات العائلية"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">نوع العرض:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PromotionType)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed_amount">مبلغ مالي ثابت ({currency})</option>
                <option value="bogo">اشتري واحصل (BOGO Deal)</option>
                <option value="category_deal">عرض قسم معين</option>
              </select>
            </div>

            {type === 'percentage' || type === 'category_deal' ? (
              <>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    نسبة الخصم (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={discountValStr}
                    onChange={(e) => setDiscountValStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    الحد الأقصى للخصم ({currency}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxCapStr}
                    onChange={(e) => setMaxCapStr(e.target.value)}
                    placeholder="0 = بدون سقف"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-xs"
                  />
                </div>
              </>
            ) : type === 'fixed_amount' ? (
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  مبلغ الخصم ({currency}):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={discountValStr}
                  onChange={(e) => setDiscountValStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-xs"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    الطبق المستهدف:
                  </label>
                  <select
                    value={selectedMealId}
                    onChange={(e) => setSelectedMealId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="">أي طبق بالسلة</option>
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    اشترِ (كمية) / احصل على:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={bogoBuyQty}
                      onChange={(e) => setBogoBuyQty(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 font-mono text-white text-center text-xs"
                      title="كمية الشراء"
                    />
                    <span className="text-slate-500 font-bold">+</span>
                    <input
                      type="number"
                      min="1"
                      value={bogoGetQty}
                      onChange={(e) => setBogoGetQty(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 font-mono text-white text-center text-xs"
                      title="كمية الهدية"
                    />
                    <span className="text-slate-400 text-[10px]">بخصم {bogoPercent}%</span>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                الحد الأدنى للطلب ({currency}):
              </label>
              <input
                type="number"
                min="0"
                value={minOrderStr}
                onChange={(e) => setMinOrderStr(e.target.value)}
                placeholder="0 = بدون حد أدنى"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                وصف العرض والشروط:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شروط الاستخدام ومزايا العرض..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                شارة ترويجية مميزة:
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="مثال: الأكثر طلباً، عرض الأسبوع، عرض العائلات"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتفعيل العرض الترويجي</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {promotions.map((p) => {
          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all ${
                p.isActive
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-950/50 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs">
                    {p.code}
                  </span>
                  {p.badge && (
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                      {p.badge}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      p.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.isActive ? 'نشط ومفعل' : 'معطل'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p.id)}
                    title={p.isActive ? 'تعطيل العرض' : 'تفعيل العرض'}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      p.isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    title="حذف العرض"
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="text-sm font-extrabold text-white mb-1">{p.title}</h4>
              <p className="text-xs text-slate-400 mb-3">{p.description}</p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-[11px]">
                <div className="bg-slate-900 rounded-xl p-2">
                  <span className="text-slate-500 block text-[10px]">النوع</span>
                  <span className="font-bold text-slate-300">
                    {p.type === 'percentage'
                      ? `نسبة (${p.discountValue}%)`
                      : p.type === 'fixed_amount'
                      ? formatCurrency(p.discountValue, currency)
                      : p.type === 'bogo'
                      ? `BOGO (${p.bogoBuyQty}+${p.bogoGetQty})`
                      : 'عرض قسم'}
                  </span>
                </div>

                <div className="bg-slate-900 rounded-xl p-2">
                  <span className="text-slate-500 block text-[10px]">الحد الأدنى</span>
                  <span className="font-mono font-bold text-slate-300">
                    {p.minOrderAmount > 0
                      ? formatCurrency(p.minOrderAmount, currency)
                      : 'بدون حد'}
                  </span>
                </div>

                <div className="bg-slate-900 rounded-xl p-2">
                  <span className="text-slate-500 block text-[10px]">الاستخدام</span>
                  <span className="font-mono font-bold text-amber-400">
                    {p.usageCount || 0} مرة
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
