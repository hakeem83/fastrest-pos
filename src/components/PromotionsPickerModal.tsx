import React, { useState } from 'react';
import { Promotion } from '../types';
import { formatCurrency } from '../services/storage';
import {
  CartItemLike,
  PromotionsEngine,
} from '../services/promotionsEngine';
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Search,
  Sparkles,
  Tag,
  Ticket,
  Utensils,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  promotions: Promotion[];
  cart: CartItemLike[];
  subtotalMinor: number;
  currency: string;
  activePromoCode?: string;
  onApplyPromotion: (promo: Promotion) => void;
  onRemovePromotion: () => void;
}

export const PromotionsPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  promotions,
  cart,
  subtotalMinor,
  currency,
  activePromoCode,
  onApplyPromotion,
  onRemovePromotion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');

  if (!isOpen) return null;

  const activePromotions = promotions.filter((p) => p.isActive);

  const filteredPromotions = activePromotions.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      p.code.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const handleManualApply = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    if (!manualCode.trim()) {
      setManualError('يرجى إدخال كود الكوبون.');
      return;
    }

    const matched = PromotionsEngine.findByCode(manualCode, promotions);
    if (!matched) {
      setManualError(`كود الكوبون "${manualCode.trim().toUpperCase()}" غير موجود أو غير صالح.`);
      return;
    }

    const evalResult = PromotionsEngine.evaluate(matched, cart, subtotalMinor, currency);
    if (!evalResult.valid) {
      setManualError(evalResult.reason || 'الكوبون لا يستوفي شروط الطلب الحالي.');
      return;
    }

    onApplyPromotion(matched);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>محرك العروض والكوبونات التسويقية</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {activePromotions.length} عروض نشطة
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                اختر العرض المناسب لتطبيقه على فاتورة الكاشير أو أدخل كود ترويجي مخصص
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manual Code Input Bar */}
        <form onSubmit={handleManualApply} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setManualError('');
                }}
                placeholder="أدخل كود الكوبون التسويقي (مثال: WELCOME15، WEEKEND20)..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs uppercase font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>تطبيق الكوبون</span>
            </button>
          </div>

          {manualError && (
            <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-1.5 text-rose-300 text-[11px] font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}
        </form>

        {/* Search Offers */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في قائمة العروض المتاحة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {activePromoCode && (
            <button
              type="button"
              onClick={() => {
                onRemovePromotion();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إلغاء الكوبون النشط
            </button>
          )}
        </div>

        {/* Promotions Catalog Grid */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredPromotions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Gift className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>لا توجد عروض تطابق بحثك حالياً.</p>
            </div>
          ) : (
            filteredPromotions.map((promo) => {
              const evalResult = PromotionsEngine.evaluate(
                promo,
                cart,
                subtotalMinor,
                currency
              );
              const isSelected =
                activePromoCode?.trim().toUpperCase() ===
                promo.code.trim().toUpperCase();

              return (
                <div
                  key={promo.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                      : evalResult.valid
                      ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs tracking-wider">
                          {promo.code}
                        </span>
                        {promo.badge && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                            {promo.badge}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            مطبق حالياً على الفاتورة
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-white leading-snug">
                        {promo.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {promo.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                        {promo.minOrderAmount > 0 && (
                          <span>
                            حد أدنى: {formatCurrency(promo.minOrderAmount, currency)}
                          </span>
                        )}
                        {promo.maxDiscountCap && promo.maxDiscountCap > 0 && (
                          <span>
                            أقصى خصم:{' '}
                            {formatCurrency(promo.maxDiscountCap, currency)}
                          </span>
                        )}
                        <span>مرات الاستخدام: {promo.usageCount || 0}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      {evalResult.valid ? (
                        <>
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-400 font-bold block">
                              وفر مع هذا العرض
                            </span>
                            <span className="text-base font-black font-mono text-emerald-400">
                              -{formatCurrency(evalResult.discountMinor, currency)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onApplyPromotion(promo);
                              onClose();
                            }}
                            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'تحديث التطبيق' : 'تطبيق هذا العرض'}</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-left sm:text-right max-w-xs">
                          <span className="text-[11px] text-amber-400/90 font-medium block">
                            {evalResult.reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
