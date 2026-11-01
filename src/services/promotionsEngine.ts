import { Promotion } from '../types';
import { formatCurrency, getTodayDateString } from './storage';

export interface CartItemLike {
  menuItemId: string;
  code?: string;
  name?: string;
  category?: string;
  unitPrice: number;
  qty: number;
}

export interface PromotionEvaluationResult {
  valid: boolean;
  discountMinor: number;
  reason?: string;
  details?: string;
  appliedPromotion?: Promotion;
}

export class PromotionsEngine {
  /**
   * Evaluate a promotion against the current cart and subtotal
   */
  static evaluate(
    promo: Promotion,
    cart: CartItemLike[],
    subtotalMinor: number,
    currency = 'ج.م'
  ): PromotionEvaluationResult {
    if (!promo.isActive) {
      return {
        valid: false,
        discountMinor: 0,
        reason: `الكوبون "${promo.code}" غير نشط حالياً أو تم إيقافه.`,
      };
    }

    const today = getTodayDateString();
    if (promo.startDate && today < promo.startDate) {
      return {
        valid: false,
        discountMinor: 0,
        reason: `هذا العرض يبدأ بتاريخ ${promo.startDate}.`,
      };
    }
    if (promo.endDate && today > promo.endDate) {
      return {
        valid: false,
        discountMinor: 0,
        reason: `هذا العرض انتهت صلاحيته في ${promo.endDate}.`,
      };
    }

    if (cart.length === 0 || subtotalMinor <= 0) {
      return {
        valid: false,
        discountMinor: 0,
        reason: 'يرجى إضافة أطباق إلى السلة أولاً لتطبيق العرض.',
      };
    }

    // Minimum Order Amount Check
    if (promo.minOrderAmount > 0 && subtotalMinor < promo.minOrderAmount) {
      const remainingMinor = promo.minOrderAmount - subtotalMinor;
      return {
        valid: false,
        discountMinor: 0,
        reason: `الحد الأدنى لتفعيل العرض هو ${formatCurrency(
          promo.minOrderAmount,
          currency
        )}. يرجى إضافة أصناف بقيمة ${formatCurrency(remainingMinor, currency)} إضافية.`,
      };
    }

    // Calculation by Type
    switch (promo.type) {
      case 'percentage': {
        let eligibleSubtotal = subtotalMinor;

        if (promo.applicableCategory && promo.applicableCategory !== 'all') {
          const catItems = cart.filter((c) => c.category === promo.applicableCategory);
          if (catItems.length === 0) {
            return {
              valid: false,
              discountMinor: 0,
              reason: `هذا الكوبون يسري فقط على وجبات قسم "${promo.applicableCategory}". السلة لا تحتوي عليها.`,
            };
          }
          eligibleSubtotal = catItems.reduce((s, it) => s + it.unitPrice * it.qty, 0);
        }

        let discount = Math.round((eligibleSubtotal * promo.discountValue) / 100);
        if (promo.maxDiscountCap && promo.maxDiscountCap > 0 && discount > promo.maxDiscountCap) {
          discount = promo.maxDiscountCap;
        }

        return {
          valid: true,
          discountMinor: Math.min(discount, subtotalMinor),
          details: `خصم ${promo.discountValue}% (وفرت ${formatCurrency(
            discount,
            currency
          )})`,
          appliedPromotion: promo,
        };
      }

      case 'fixed_amount': {
        const discount = Math.min(promo.discountValue, subtotalMinor);
        return {
          valid: true,
          discountMinor: discount,
          details: `خصم نقدي مباشر ${formatCurrency(discount, currency)}`,
          appliedPromotion: promo,
        };
      }

      case 'category_deal': {
        const categoryName = promo.applicableCategory;
        const matchedItems = cart.filter(
          (c) => !categoryName || categoryName === 'all' || c.category === categoryName
        );

        if (matchedItems.length === 0) {
          return {
            valid: false,
            discountMinor: 0,
            reason: `العرض مخصص لقسم "${categoryName || 'محدد'}"، ولم يتم إضافة أي صنف منه بالسلة.`,
          };
        }

        const catSubtotal = matchedItems.reduce((s, it) => s + it.unitPrice * it.qty, 0);
        let discount = Math.round((catSubtotal * promo.discountValue) / 100);
        if (promo.maxDiscountCap && promo.maxDiscountCap > 0 && discount > promo.maxDiscountCap) {
          discount = promo.maxDiscountCap;
        }

        return {
          valid: true,
          discountMinor: Math.min(discount, subtotalMinor),
          details: `خصم ${promo.discountValue}% على قسم ${categoryName} (وفرت ${formatCurrency(
            discount,
            currency
          )})`,
          appliedPromotion: promo,
        };
      }

      case 'bogo': {
        // Buy X Get Y deal
        const buyQty = promo.bogoBuyQty || 1;
        const getQty = promo.bogoGetQty || 1;
        const discountPct = promo.bogoDiscountPercent !== undefined ? promo.bogoDiscountPercent : 100;

        let targetLines = cart;
        if (promo.applicableMenuItemId) {
          targetLines = cart.filter((c) => c.menuItemId === promo.applicableMenuItemId);
        }

        const totalQty = targetLines.reduce((s, it) => s + it.qty, 0);
        const comboBatchSize = buyQty + getQty;

        if (totalQty < comboBatchSize) {
          const needed = comboBatchSize - totalQty;
          return {
            valid: false,
            discountMinor: 0,
            reason: `عرض BOGO يتطلب طلب ${comboBatchSize} قطع على الأقل (اشترِ ${buyQty} واحصل على ${getQty} بخصم ${discountPct}%). ينقصك ${needed} قطعة لتفعيله.`,
          };
        }

        // Calculate discount on the free/discounted items (lowest price or applicable item price)
        const batches = Math.floor(totalQty / comboBatchSize);
        const freeItemsCount = batches * getQty;

        // Find reference unit price
        const refUnitPrice = targetLines[0]?.unitPrice || 0;
        const discountPerItem = Math.round((refUnitPrice * discountPct) / 100);
        const totalBogoDiscount = discountPerItem * freeItemsCount;

        return {
          valid: true,
          discountMinor: Math.min(totalBogoDiscount, subtotalMinor),
          details: `عرض BOGO (${freeItemsCount} وجبة بخصم ${discountPct}%)`,
          appliedPromotion: promo,
        };
      }

      default:
        return {
          valid: false,
          discountMinor: 0,
          reason: 'نوع العرض غير مدعوم',
        };
    }
  }

  /**
   * Find matching active promotion by coupon code (case-insensitive)
   */
  static findByCode(code: string, promotions: Promotion[]): Promotion | undefined {
    const clean = code.trim().toUpperCase();
    return promotions.find((p) => p.code.trim().toUpperCase() === clean);
  }
}
