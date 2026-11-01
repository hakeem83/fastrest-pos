import React, { useEffect, useMemo, useState } from 'react';
import {
  Customer,
  DeliveryDriver,
  InventoryItem,
  KitchenStation,
  MenuItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Promotion,
  RestaurantSettings,
  SaleOrder,
  Shift,
  Voucher,
} from '../types';
import {
  formatCurrency,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  StorageService,
} from '../services/storage';
import { PromotionsEngine } from '../services/promotionsEngine';
import { QuickCustomerModal } from './QuickCustomerModal';
import { PromotionsPickerModal } from './PromotionsPickerModal';
import { OrderPrintMode } from './PrintPreviewDialog';
import {
  AlertTriangle,
  Banknote,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  Flame,
  HandCoins,
  Layers,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  UserCheck,
  UserPlus,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  activeShift: Shift;
  settings: RestaurantSettings;
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  customers: Customer[];
  onOrderCompleted: (order: SaleOrder, shouldPrint: boolean, mode?: OrderPrintMode) => void;
  onVoucherCreated: (voucher: Voucher, shouldPrint: boolean) => void;
  onRefresh: () => void;
}

interface CartLine {
  menuItemId: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  qty: number;
  notes?: string;
  kitchenStationId?: string;
  kitchenStationName?: string;
}

const PRESET_KITCHEN_NOTES = [
  'بدون بصل',
  'شطة زيادة 🔥',
  'تسوية ويل دن',
  'بدون مخلل',
  'خبز إضافي',
  'سوس خارجي',
  'ملح خفيف',
  'مستعجل جداً ⚡',
];

export const CashierPOSView: React.FC<Props> = ({
  activeShift,
  settings,
  menuItems,
  inventory,
  customers,
  onOrderCompleted,
  onVoucherCreated,
  onRefresh,
}) => {
  const isRetail = settings.businessType === 'retail';

  // Master Data & Stations
  const [kitchenStations, setKitchenStations] = useState<KitchenStation[]>(() =>
    StorageService.getKitchenStations()
  );
  const [deliveryDrivers, setDeliveryDrivers] = useState<DeliveryDriver[]>(() =>
    StorageService.getDeliveryDrivers()
  );
  const [openOrders, setOpenOrders] = useState<SaleOrder[]>(() =>
    StorageService.getOpenOrders(activeShift.id)
  );

  const refreshOpenOrders = () => {
    setOpenOrders(StorageService.getOpenOrders(activeShift.id));
    setDeliveryDrivers(StorageService.getDeliveryDrivers());
    setKitchenStations(StorageService.getKitchenStations());
  };

  const sellableDishes: MenuItem[] = useMemo(() => {
    if (isRetail) {
      return inventory.map((inv) => ({
        id: inv.id,
        code: inv.code,
        name: inv.name,
        category: inv.category,
        sellingPrice: inv.salePrice || inv.unitCost,
        theoreticalCost: inv.unitCost,
        active: true,
      }));
    }
    return menuItems.filter((m) => m.active !== false);
  }, [isRetail, menuItems, inventory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    sellableDishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ['all', ...Array.from(set)];
  }, [sellableDishes]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Order Type & Destination State
  const [orderType, setOrderType] = useState<OrderType>(isRetail ? 'takeaway' : 'dine_in');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [tableGuests, setTableGuests] = useState<number>(2);

  // Delivery specific state
  const [deliveryDriverId, setDeliveryDriverId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryPhone, setDeliveryPhone] = useState<string>('');
  const [deliveryFeeEgpStr, setDeliveryFeeEgpStr] = useState<string>('15');

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountEgpStr, setDiscountEgpStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Quick Cash Tender & Change Calculator State
  const [cashTenderedStr, setCashTenderedStr] = useState<string>('');

  // Item Notes Modal / Drawer State
  const [editingItemNoteIndex, setEditingItemNoteIndex] = useState<number | null>(null);
  const [itemNoteInput, setItemNoteInput] = useState<string>('');

  // Active Orders Drawer State
  const [showOpenOrdersDrawer, setShowOpenOrdersDrawer] = useState<boolean>(false);
  const [payingOrder, setPayingOrder] = useState<SaleOrder | null>(null);
  const [payOrderMethod, setPayOrderMethod] = useState<PaymentMethod>('cash');
  const [payOrderRef, setPayOrderRef] = useState<string>('');

  // Driver Custody Modal State
  const [showDriverCustodyModal, setShowDriverCustodyModal] = useState<boolean>(false);
  const [settleDriver, setSettleDriver] = useState<DeliveryDriver | null>(null);
  const [settleAmountStr, setSettleAmountStr] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settleErr, setSettleErr] = useState<string>('');

  // Quick Customer Registration (Cashier Restricted) Modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState<boolean>(false);

  // Marketing Promotions & Coupons Engine State
  const [promotions, setPromotions] = useState<Promotion[]>(() =>
    StorageService.getPromotions()
  );
  const [showPromotionsPicker, setShowPromotionsPicker] = useState<boolean>(false);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [couponInput, setCouponInput] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');

  // Inspect Recipe Modal for a dish
  const [inspectingDish, setInspectingDish] = useState<MenuItem | null>(null);

  // Quick Customer Debt Collection Modal
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);
  const [collectCustId, setCollectCustId] = useState<string>('');
  const [collectAmountStr, setCollectAmountStr] = useState<string>('');
  const [collectDesc, setCollectDesc] = useState<string>('');
  const [collectErr, setCollectErr] = useState<string>('');

  // Auto-sync customer address/phone when selecting delivery customer
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (selectedCustomer && orderType === 'delivery') {
      if (selectedCustomer.phone && !deliveryPhone) setDeliveryPhone(selectedCustomer.phone);
      if (selectedCustomer.address && !deliveryAddress) setDeliveryAddress(selectedCustomer.address);
    }
  }, [selectedCustomer, orderType]);

  const filteredDishes = useMemo(() => {
    return sellableDishes.filter((d) => {
      const matchesCat = selectedCategory === 'all' || d.category === selectedCategory;
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [sellableDishes, selectedCategory, searchQuery]);

  // Tables occupied by active dine-in orders
  const occupiedTablesMap = useMemo(() => {
    const map = new Map<string, SaleOrder>();
    openOrders.forEach((o) => {
      if (o.orderType === 'dine_in' && o.tableNumber) {
        map.set(o.tableNumber, o);
      }
    });
    return map;
  }, [openOrders]);

  // Total cash in drivers' custody
  const totalDriverCustodyMinor = useMemo(
    () => deliveryDrivers.reduce((sum, d) => sum + (d.cashInCustodyMinor || 0), 0),
    [deliveryDrivers]
  );

  // Cart Operations
  const handleAddToCart = (dish: MenuItem) => {
    setErrorMsg('');
    const station = kitchenStations.find((s) => s.id === dish.kitchenStationId);

    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.menuItemId === dish.id && !c.notes);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          code: dish.code,
          name: dish.name,
          category: dish.category,
          unitPrice: dish.sellingPrice,
          qty: 1,
          kitchenStationId: station?.id,
          kitchenStationName: station?.name,
        },
      ];
    });
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c, i) => (i === idx ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const handleRemoveFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOpenItemNoteModal = (idx: number) => {
    setEditingItemNoteIndex(idx);
    setItemNoteInput(cart[idx]?.notes || '');
  };

  const handleSaveItemNote = (noteText: string) => {
    if (editingItemNoteIndex === null) return;
    setCart((prev) =>
      prev.map((c, i) => (i === editingItemNoteIndex ? { ...c, notes: noteText.trim() || undefined } : c))
    );
    setEditingItemNoteIndex(null);
    setItemNoteInput('');
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountEgpStr('0');
    setPaymentRef('');
    setOrderNotes('');
    setCashTenderedStr('');
    setErrorMsg('');
    setAppliedPromotion(null);
    setCouponInput('');
    setCouponError('');
  };

  // Subtotal & Financial Calculations
  const subtotalMinor = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    [cart]
  );

  const promoEval = useMemo(() => {
    if (!appliedPromotion) {
      return { valid: false, discountMinor: 0, reason: '' };
    }
    return PromotionsEngine.evaluate(
      appliedPromotion,
      cart,
      subtotalMinor,
      settings.currency
    );
  }, [appliedPromotion, cart, subtotalMinor, settings.currency]);

  const promoDiscountMinor = promoEval.valid ? promoEval.discountMinor : 0;

  const manualDiscountMinor = useMemo(() => {
    const val = parseFloat(discountEgpStr);
    if (isNaN(val) || val <= 0) return 0;
    const remainingAfterPromo = Math.max(0, subtotalMinor - promoDiscountMinor);
    return Math.min(remainingAfterPromo, Math.round(val * 100));
  }, [discountEgpStr, subtotalMinor, promoDiscountMinor]);

  const deliveryFeeMinor = useMemo(() => {
    if (orderType !== 'delivery') return 0;
    const val = parseFloat(deliveryFeeEgpStr);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val * 100);
  }, [orderType, deliveryFeeEgpStr]);

  const totalDiscountMinor = promoDiscountMinor + manualDiscountMinor;
  const netTotalMinor = Math.max(0, subtotalMinor - totalDiscountMinor + deliveryFeeMinor);

  // Cash Tendered & Change
  const cashTenderedMinor = useMemo(() => {
    const val = parseFloat(cashTenderedStr);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val * 100);
  }, [cashTenderedStr]);

  const changeDueMinor = Math.max(0, cashTenderedMinor - netTotalMinor);

  // Credit sale eligibility check
  const creditValidation = useMemo(() => {
    if (paymentMethod !== 'credit') {
      return { valid: true, message: '' };
    }
    if (!selectedCustomer) {
      return {
        valid: false,
        message: 'البيع الآجل يشترط اختيار عميل مسجل في التطبيق أولاً.',
      };
    }
    if (!selectedCustomer.allowCredit) {
      return {
        valid: false,
        message: `العميل "${selectedCustomer.name}" غير مصرح له بالبيع الآجل من قِبل الإدارة.`,
      };
    }
    const projectedDebt = selectedCustomer.currentDebt + netTotalMinor;
    if (selectedCustomer.creditLimit > 0 && projectedDebt > selectedCustomer.creditLimit) {
      return {
        valid: false,
        message: `تجاوز الحد الائتماني (${formatCurrency(
          selectedCustomer.creditLimit,
          settings.currency
        )}). المديونية المتوقعة: ${formatCurrency(projectedDebt, settings.currency)}.`,
      };
    }
    return { valid: true, message: '' };
  }, [paymentMethod, selectedCustomer, netTotalMinor, settings.currency]);

  // Promotions Handlers
  const handleApplyPromotion = (promo: Promotion) => {
    setCouponError('');
    setAppliedPromotion(promo);
    setCouponInput(promo.code);
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setCouponInput('');
    setCouponError('');
  };

  const handleApplyCouponCode = (code: string) => {
    setCouponError('');
    if (!code.trim()) {
      setCouponError('يرجى إدخال كود الكوبون.');
      return;
    }
    const matched = PromotionsEngine.findByCode(code, promotions);
    if (!matched) {
      setCouponError(`كود الكوبون "${code.trim().toUpperCase()}" غير موجود أو غير نشط.`);
      return;
    }
    const evaluation = PromotionsEngine.evaluate(matched, cart, subtotalMinor, settings.currency);
    if (!evaluation.valid) {
      setCouponError(evaluation.reason || 'الكوبون لا يستوفي شروط الطلب.');
      return;
    }
    setAppliedPromotion(matched);
    setCouponInput(matched.code);
  };

  // Stock status check
  const getDishStockStatus = (dish: MenuItem) => {
    if (isRetail) {
      const inv = inventory.find((i) => i.id === dish.id);
      const stock = inv ? inv.currentStock : 0;
      return {
        available: stock > 0,
        lowStock: inv ? stock <= inv.minStockAlert : false,
        label: `${stock} ${inv?.unit || ''}`,
      };
    }
    if (!dish.ingredients || dish.ingredients.length === 0) {
      return { available: true, lowStock: false, label: 'متاح' };
    }
    let minServings = Infinity;
    for (const ing of dish.ingredients) {
      const invItem = inventory.find((i) => i.id === ing.inventoryItemId);
      if (!invItem || ing.qty <= 0) continue;
      const possible = Math.floor(invItem.currentStock / ing.qty);
      if (possible < minServings) minServings = possible;
    }
    if (minServings === Infinity) {
      return { available: true, lowStock: false, label: 'متاح' };
    }
    return {
      available: minServings > 0,
      lowStock: minServings > 0 && minServings <= 5,
      label: `يكفي ~${minServings} وجبة`,
    };
  };

  // 1. Send To Kitchen & Hold (KOT)
  const handleSendToKitchen = (shouldPrint = true) => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('السلة فارغة. يرجى اختيار صنف واحد على الأقل.');
      return;
    }

    try {
      const createdOrder = StorageService.createSaleOrder({
        shiftId: activeShift.id,
        cashierName: activeShift.cashierName,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        tableGuests: orderType === 'dine_in' ? tableGuests : undefined,
        deliveryFeeMinor,
        deliveryDriverId: orderType === 'delivery' ? deliveryDriverId || undefined : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() || undefined : undefined,
        deliveryPhone: orderType === 'delivery' ? deliveryPhone.trim() || undefined : undefined,
        orderStatus: 'in_kitchen',
        paymentStatus: 'unpaid',
        paymentMethod: 'cash',
        customerId: selectedCustomerId || undefined,
        lines: cart.map((c) => ({
          menuItemId: c.menuItemId,
          qty: c.qty,
          notes: c.notes,
          kitchenStationId: c.kitchenStationId,
        })),
        discountMinor: totalDiscountMinor,
        couponCode: appliedPromotion?.code,
        promotionTitle: appliedPromotion?.title,
        promotionDiscountMinor: promoDiscountMinor,
        notes: orderNotes.trim() || undefined,
      });

      handleClearCart();
      refreshOpenOrders();
      setSuccessBanner(
        `تم إرسال الطلب ${createdOrder.orderNumber} إلى المطبخ بنجاح (حالة معلقة: ${getOrderTypeLabel(
          createdOrder.orderType
        )}).`
      );
      setTimeout(() => setSuccessBanner(''), 5000);
      onOrderCompleted(createdOrder, shouldPrint, 'kitchen_kot');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الطلب للمطبخ');
    }
  };

  // 2. Instant Pay & Close
  const handleInstantPayAndClose = (shouldPrint = true) => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('السلة فارغة. يرجى اختيار صنف واحد على الأقل.');
      return;
    }
    if (!creditValidation.valid) {
      setErrorMsg(creditValidation.message);
      return;
    }

    try {
      const createdOrder = StorageService.createSaleOrder({
        shiftId: activeShift.id,
        cashierName: activeShift.cashierName,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        tableGuests: orderType === 'dine_in' ? tableGuests : undefined,
        deliveryFeeMinor,
        deliveryDriverId: orderType === 'delivery' ? deliveryDriverId || undefined : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() || undefined : undefined,
        deliveryPhone: orderType === 'delivery' ? deliveryPhone.trim() || undefined : undefined,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        paymentMethod,
        paymentRef: paymentRef.trim() || undefined,
        customerId: selectedCustomerId || undefined,
        lines: cart.map((c) => ({
          menuItemId: c.menuItemId,
          qty: c.qty,
          notes: c.notes,
          kitchenStationId: c.kitchenStationId,
        })),
        discountMinor: totalDiscountMinor,
        couponCode: appliedPromotion?.code,
        promotionTitle: appliedPromotion?.title,
        promotionDiscountMinor: promoDiscountMinor,
        notes: orderNotes.trim() || undefined,
      });

      handleClearCart();
      refreshOpenOrders();
      if (paymentMethod === 'credit') setPaymentMethod('cash');
      setSuccessBanner(
        `تم تحصيل الفاتورة ${createdOrder.orderNumber} بنجاح (${getPaymentMethodLabel(
          createdOrder.paymentMethod
        )}) وإغلاق الطلب.`
      );
      setTimeout(() => setSuccessBanner(''), 5000);
      onOrderCompleted(createdOrder, shouldPrint, 'customer_invoice');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الفاتورة');
    }
  };

  // Settle Open Order from Drawer
  const handleConfirmPayOpenOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;

    try {
      const closed = StorageService.payAndCloseOrder({
        orderId: payingOrder.id,
        paymentMethod: payOrderMethod,
        paymentRef: payOrderRef.trim() || undefined,
        cashierName: activeShift.cashierName,
      });

      setPayingOrder(null);
      setPayOrderRef('');
      refreshOpenOrders();
      onRefresh();
      setSuccessBanner(`تم تحصيل حساب الطلب ${closed.orderNumber} بنجاح وإغلاقه.`);
      setTimeout(() => setSuccessBanner(''), 5000);
      onOrderCompleted(closed, true, 'customer_invoice');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'تعذر تحصيل الحساب');
    }
  };

  // Change Order Status in Drawer
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    StorageService.updateOrderStatus(orderId, nextStatus);
    refreshOpenOrders();
  };

  // Driver Custody Settlement
  const handleConfirmSettleDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleDriver) return;
    const amountVal = parseFloat(settleAmountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      setSettleErr('يرجى إدخال مبلغ صحيح للتوريد');
      return;
    }
    const amountMinor = Math.round(amountVal * 100);

    try {
      const vch = StorageService.settleDriverCash({
        driverId: settleDriver.id,
        settledAmountMinor: amountMinor,
        shiftId: activeShift.id,
        cashierName: activeShift.cashierName,
        notes: settleNotes.trim() || undefined,
      });

      setSettleDriver(null);
      setSettleAmountStr('');
      setSettleNotes('');
      setSettleErr('');
      setShowDriverCustodyModal(false);
      refreshOpenOrders();
      onRefresh();
      setSuccessBanner(`تم استلام مبلغ ${formatCurrency(amountMinor, settings.currency)} من الطيار ${settleDriver.name} وإيداعه بالخزينة.`);
      setTimeout(() => setSuccessBanner(''), 5000);
      onVoucherCreated(vch, true);
    } catch (err: unknown) {
      setSettleErr(err instanceof Error ? err.message : 'تعذر توريد النقدية');
    }
  };

  // Quick Debt Collection
  const handleCollectCustomerDebt = (e: React.FormEvent, shouldPrint: boolean) => {
    e.preventDefault();
    setCollectErr('');
    const cust = customers.find((c) => c.id === collectCustId);
    if (!cust) {
      setCollectErr('يرجى اختيار العميل');
      return;
    }
    const amountVal = parseFloat(collectAmountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      setCollectErr('يرجى إدخال مبلغ صحيح');
      return;
    }
    const amountMinor = Math.round(amountVal * 100);
    const newVoucher = StorageService.addVoucher({
      shiftId: activeShift.id,
      type: 'customer_collection',
      amount: amountMinor,
      accountCode: 'REC-202',
      accountName: 'تحصيل مديونية عملاء آجل',
      recipient: cust.name,
      description: collectDesc.trim() || `تحصيل دفعة نقدية من حساب العميل ${cust.name}`,
      cashierName: activeShift.cashierName,
      customerId: cust.id,
    });
    setShowCollectModal(false);
    setCollectCustId('');
    setCollectAmountStr('');
    setCollectDesc('');
    onRefresh();
    onVoucherCreated(newVoucher, shouldPrint);
  };

  const paymentOptions: {
    id: PaymentMethod;
    label: string;
    icon: React.ReactNode;
    accent: string;
  }[] = [
    {
      id: 'cash',
      label: 'نقداً (كاش)',
      icon: <Banknote className="w-4 h-4" />,
      accent: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
    },
    {
      id: 'visa',
      label: 'فيزا / بطاقة',
      icon: <CreditCard className="w-4 h-4" />,
      accent: 'border-sky-500 bg-sky-500/15 text-sky-300',
    },
    {
      id: 'instapay',
      label: 'إنستاباي',
      icon: <Zap className="w-4 h-4" />,
      accent: 'border-purple-500 bg-purple-500/15 text-purple-300',
    },
    {
      id: 'ewallet',
      label: 'محفظة إلكترونية',
      icon: <Smartphone className="w-4 h-4" />,
      accent: 'border-amber-500 bg-amber-500/15 text-amber-300',
    },
    {
      id: 'credit',
      label: 'آجل (عميل مسجل)',
      icon: <Wallet className="w-4 h-4" />,
      accent: 'border-rose-500 bg-rose-500/15 text-rose-300',
    },
  ];

  return (
    <div className="space-y-4">
      {/* TOP HEADER STATUS & OPERATIONS BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">نقطة البيع السريعة للكاشير (POS Express)</h2>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                وردية #{activeShift.shiftNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              توجيه فوري لأقسام المطبخ (KOT) · إدارة الطاولات المفتوحة · أسطول الدليفري والطيارين
            </p>
          </div>
        </div>

        {/* Quick Operations Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Orders & Open Tables Button */}
          <button
            type="button"
            onClick={() => {
              refreshOpenOrders();
              setShowOpenOrdersDrawer(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>الطلبات الجارية والطاولات</span>
            <span className="bg-amber-500 text-slate-950 font-mono font-bold px-1.5 py-0.2 rounded-full text-[11px]">
              {openOrders.length}
            </span>
          </button>

          {/* Delivery Driver Custody Button */}
          <button
            type="button"
            onClick={() => {
              setDeliveryDrivers(StorageService.getDeliveryDrivers());
              setShowDriverCustodyModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Bike className="w-4 h-4" />
            <span>عهدة الطيارين</span>
            {totalDriverCustodyMinor > 0 && (
              <span className="font-mono text-emerald-400 font-black">
                ({formatCurrency(totalDriverCustodyMinor, settings.currency)})
              </span>
            )}
          </button>

          {/* Customer Debt Collection Button */}
          <button
            type="button"
            onClick={() => setShowCollectModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <HandCoins className="w-4 h-4" />
            <span>تحصيل عميل آجل</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN POS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT COLUMN: DISHES & MENU CATALOG (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطبق أو الكود السريع..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'كل الأقسام' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-0.5">
            {filteredDishes.map((dish) => {
              const stockInfo = getDishStockStatus(dish);
              const inCartCount = cart
                .filter((c) => c.menuItemId === dish.id)
                .reduce((s, c) => s + c.qty, 0);
              const station = kitchenStations.find((s) => s.id === dish.kitchenStationId);

              return (
                <div
                  key={dish.id}
                  className={`group relative bg-slate-950/90 border rounded-2xl p-3.5 flex flex-col justify-between transition-all ${
                    inCartCount > 0
                      ? 'border-amber-500 shadow-md shadow-amber-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                        {dish.code}
                      </span>
                      {station && (
                        <span className="text-[10px] bg-slate-900 text-amber-300 border border-slate-800 px-1.5 py-0.5 rounded font-bold truncate max-w-[110px]">
                          🔥 {station.name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          !stockInfo.available
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : stockInfo.lowStock
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {stockInfo.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-white leading-snug mb-1">
                      {dish.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 block mb-2">{dish.category}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">سعر البيع</span>
                        <strong className="text-base font-black font-mono text-amber-400">
                          {formatCurrency(dish.sellingPrice, settings.currency)}
                        </strong>
                      </div>

                      {!isRetail && (
                        <button
                          type="button"
                          onClick={() => setInspectingDish(dish)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-[11px] flex items-center gap-1 cursor-pointer"
                          title="معاينة الوصفة والتكلفة المرتبطة بالمخزون"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>الوصفة</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(dish)}
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {inCartCount > 0 ? `إضافة المزيد (${inCartCount} بالسلة)` : 'إضافة للطلب'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEFT COLUMN: FAST CART & ORDER TYPE & DUAL CHECKOUT (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl sticky top-20">
          {/* 1. ORDER TYPE SELECTOR (صالة / تيك أواي / دليفري) */}
          <div className="space-y-2 border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-300">نوع الطلب والوجهة:</label>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إفراغ</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  orderType === 'dine_in'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>صالة محلي</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  orderType === 'takeaway'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>تيك أواي سفري</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  orderType === 'delivery'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>دليفري توصيل</span>
              </button>
            </div>

            {/* Sub-Panel: Dine-in Table Picker */}
            {orderType === 'dine_in' && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold">اختر الطاولة:</span>
                  <div className="flex items-center gap-1">
                    <span>عدد الأفراد:</span>
                    <select
                      value={tableGuests}
                      onChange={(e) => setTableGuests(parseInt(e.target.value) || 2)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-xs font-mono"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((g) => (
                        <option key={g} value={g}>
                          {g} أفراد
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((tNum) => {
                    const isOccupied = occupiedTablesMap.has(tNum);
                    const isSelected = tableNumber === tNum;
                    return (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => setTableNumber(tNum)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : isOccupied
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                        }`}
                        title={
                          isOccupied
                            ? `طاولة ${tNum} مشغولة (${occupiedTablesMap.get(tNum)?.orderNumber})`
                            : `طاولة ${tNum} فارغة`
                        }
                      >
                        {tNum}
                        {isOccupied && (
                          <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-black" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Panel: Takeaway Sequence Preview */}
            {orderType === 'takeaway' && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">رقم نداء الطلب التالي:</span>
                <span className="font-mono font-black text-amber-400 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  تيك أواي #{openOrders.length + 1}
                </span>
              </div>
            )}

            {/* Sub-Panel: Delivery Details & Driver Assignment */}
            {orderType === 'delivery' && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">الطيار المسند إليه:</label>
                    <select
                      value={deliveryDriverId}
                      onChange={(e) => setDeliveryDriverId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-hidden focus:border-sky-500"
                    >
                      <option value="">— جارِ التعيين لاحقاً —</option>
                      {deliveryDrivers
                        .filter((d) => d.isActive)
                        .map((drv) => (
                          <option key={drv.id} value={drv.id}>
                            {drv.name} ({drv.currentOrdersCount} طلبات حالية)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">رسوم التوصيل ({settings.currency}):</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={deliveryFeeEgpStr}
                        onChange={(e) => setDeliveryFeeEgpStr(e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-white text-center focus:outline-hidden"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {['0', '15', '20', '25'].map((fee) => (
                          <button
                            key={fee}
                            type="button"
                            onClick={() => setDeliveryFeeEgpStr(fee)}
                            className="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 rounded border border-slate-800 cursor-pointer"
                          >
                            {fee === '0' ? 'مجاني' : fee}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">هاتف التوصيل:</label>
                    <input
                      type="tel"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">عنوان التوصيل:</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="الشارع، العمارة، الشقة..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. CART LINE ITEMS WITH KITCHEN NOTES CHIPS */}
          {cart.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs space-y-1">
              <UtensilsCrossed className="w-6 h-6 mx-auto text-slate-600 mb-1" />
              <p className="font-bold text-slate-400">لم يتم اختيار أي أصناف بعد</p>
              <p>اضغط على أي صنف من المنيو لإضافته</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cart.map((line, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/90 rounded-xl p-2.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">{line.name}</span>
                        {line.kitchenStationName && (
                          <span className="text-[10px] bg-slate-900 text-amber-300 border border-slate-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                            {line.kitchenStationName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {formatCurrency(line.unitPrice, settings.currency)} × {line.qty} ={' '}
                        <strong className="text-amber-400">
                          {formatCurrency(line.unitPrice * line.qty, settings.currency)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-white">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer mr-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Kitchen Special Preparation Note Button / Chip */}
                  <div className="flex items-center justify-between border-t border-slate-900 pt-1">
                    {line.notes ? (
                      <div className="flex items-center gap-1 text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg">
                        <span className="font-bold">⚠️ ملاحظة:</span>
                        <span className="truncate max-w-[200px]">{line.notes}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenItemNoteModal(idx)}
                          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                          title="تعديل الملاحظة"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveItemNote('')}
                          className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                          title="حذف الملاحظة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenItemNoteModal(idx)}
                        className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        <span>ملاحظة للمطبخ (بدون بصل / شطة زيادة...)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. PAYMENT METHOD SELECTOR */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 block">طريقة الدفع:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentOptions.map((opt) => {
                const active = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      setErrorMsg('');
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? opt.accent
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Selection (Mandatory for Credit, Optional for others) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {paymentMethod === 'credit'
                  ? 'العميل المسجل (إلزامي للآجل): *'
                  : 'ربط الفاتورة بعميل (اختياري):'}
              </label>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ عميل جديد</span>
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setErrorMsg('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="">
                {paymentMethod === 'credit'
                  ? '— اختر العميل المصرح له بالآجل —'
                  : '— عميل مباشر (بدون تسجيل) —'}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) — {c.allowCredit ? 'مصرح بالآجل' : 'نقدي فقط'}
                </option>
              ))}
            </select>
          </div>

          {/* Electronic Payment Ref */}
          {(paymentMethod === 'visa' ||
            paymentMethod === 'instapay' ||
            paymentMethod === 'ewallet') && (
            <div>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="رقم مرجع العملية الإلكترونية (اختياري)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>
          )}

          {/* 4. TOTALS & CASH TENDER CHANGE CALCULATOR */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>الإجمالي الفرعي:</span>
              <span className="font-mono">{formatCurrency(subtotalMinor, settings.currency)}</span>
            </div>

            {deliveryFeeMinor > 0 && (
              <div className="flex justify-between text-xs text-sky-400">
                <span>خدمة التوصيل (دليفري):</span>
                <span className="font-mono font-bold">
                  +{formatCurrency(deliveryFeeMinor, settings.currency)}
                </span>
              </div>
            )}

            {totalDiscountMinor > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-medium">
                <span>إجمالي الخصم الممنوح:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(totalDiscountMinor, settings.currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
              <span className="text-sm font-black text-white">صافي المطلوب سداده:</span>
              <strong className="text-xl font-black font-mono text-emerald-400">
                {formatCurrency(netTotalMinor, settings.currency)}
              </strong>
            </div>

            {/* Quick Cash Tender Calculator (Only for Cash Payment) */}
            {paymentMethod === 'cash' && netTotalMinor > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">المبلغ المستلم من العميل:</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={cashTenderedStr}
                      onChange={(e) => setCashTenderedStr(e.target.value)}
                      placeholder={(netTotalMinor / 100).toFixed(0)}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-bold focus:outline-hidden focus:border-amber-500"
                    />
                    <span className="text-slate-400 text-[11px]">{settings.currency}</span>
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setCashTenderedStr((netTotalMinor / 100).toString())}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-bold text-amber-300 cursor-pointer"
                  >
                    مضبوط
                  </button>
                  {[50, 100, 200, 500].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setCashTenderedStr(denom.toString())}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-mono text-slate-300 cursor-pointer"
                    >
                      {denom}
                    </button>
                  ))}
                </div>

                {/* Change Due Display */}
                {cashTenderedMinor > 0 && (
                  <div
                    className={`p-2 rounded-lg text-xs font-black flex items-center justify-between ${
                      cashTenderedMinor >= netTotalMinor
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <span>
                      {cashTenderedMinor >= netTotalMinor
                        ? 'الباقي المستحق للعميل:'
                        : 'المتبقي لاستكمال الحساب:'}
                    </span>
                    <span className="font-mono text-sm sm:text-base">
                      {cashTenderedMinor >= netTotalMinor
                        ? formatCurrency(changeDueMinor, settings.currency)
                        : formatCurrency(netTotalMinor - cashTenderedMinor, settings.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* 5. DUAL CHECKOUT BUTTONS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Button A: Send to Kitchen & Hold (KOT) */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => handleSendToKitchen(true)}
              className="py-3 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 font-black rounded-xl text-xs flex flex-col items-center justify-center gap-1 border border-amber-500/30 transition-all cursor-pointer shadow-md"
              title="إرسال الطلب للمطبخ فوراً وطباعة بون KOT وترك الحساب معلقاً للدفع لاحقاً"
            >
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-amber-400" />
                <span>إرسال للمطبخ (KOT)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">تعليق الحساب والدفع لاحقاً</span>
            </button>

            {/* Button B: Instant Pay & Close */}
            <button
              type="button"
              disabled={cart.length === 0 || (paymentMethod === 'credit' && !creditValidation.valid)}
              onClick={() => handleInstantPayAndClose(true)}
              className="py-3 px-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              title="تحصيل المبلغ فوراً وإغلاق الطلب وطباعة فاتورة العميل"
            >
              <div className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 stroke-[2.5]" />
                <span>دفع فوري وإنهاء</span>
              </div>
              <span className="text-[10px] text-slate-950/80 font-bold">طباعة فاتورة العميل</span>
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER: ACTIVE ORDERS & OPEN TABLES */}
      {showOpenOrdersDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl p-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-white">
                    الطلبات الجارية والطاولات المفتوحة
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    الوردية #{activeShift.shiftNumber} · ({openOrders.length} طلب غير مسدد أو قيد التشغيل)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenOrdersDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {openOrders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
                <p className="font-bold text-slate-300">كافة الطلبات مغلقة ومسددة بالكامل</p>
                <p>لا توجد طاولات مفتوحة أو طلبات دليفري معلقة حالياً</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {openOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {ord.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-900 text-white border border-slate-800">
                          {ord.orderType === 'dine_in' && `🍽️ طاولة [${ord.tableNumber || 1}]`}
                          {ord.orderType === 'takeaway' && `🛍️ نداء #${ord.dailySequenceNumber || 1}`}
                          {ord.orderType === 'delivery' && `🛵 دليفري: ${ord.deliveryDriverName || 'بدون طيار'}`}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {ord.time} · {ord.date}
                      </span>
                    </div>

                    {/* Items lines summary */}
                    <div className="bg-slate-900/80 p-2 rounded-xl text-slate-300 space-y-1">
                      {ord.lines.map((l, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span>
                            {l.qty}× {l.menuItemName}
                            {l.notes && <span className="text-amber-400 mr-1">({l.notes})</span>}
                          </span>
                          <span className="font-mono text-slate-400">
                            {formatCurrency(l.totalPrice, settings.currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Status & Financial Summary */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-[10px] text-slate-500 block">حالة الطلب:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, 'in_kitchen')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              ord.orderStatus === 'in_kitchen'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            بالمطبخ 🍳
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(ord.id, 'ready')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              ord.orderStatus === 'ready'
                                ? 'bg-blue-500 text-white font-black'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            جاهز 🔔
                          </button>
                          {ord.orderType === 'delivery' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(ord.id, 'out_for_delivery')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                ord.orderStatus === 'out_for_delivery'
                                  ? 'bg-purple-500 text-white font-black'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              مع الطيار 🛵
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 block">المبلغ المطلوب:</span>
                        <strong className="font-mono text-base font-black text-emerald-400">
                          {formatCurrency(ord.totalAmount, settings.currency)}
                        </strong>
                      </div>
                    </div>

                    {/* Action Buttons: KOT print or Close / Settle */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => onOrderCompleted(ord, true, 'kitchen_kot')}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>طباعة KOT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPayingOrder(ord);
                          setPayOrderMethod('cash');
                          setPayOrderRef('');
                        }}
                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Banknote className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>تحصيل الحساب</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PAY AND CLOSE OPEN ORDER */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <form
            onSubmit={handleConfirmPayOpenOrder}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    تحصيل حساب الطلب: {payingOrder.orderNumber}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {getOrderTypeLabel(payingOrder.orderType)} · طاولة [{payingOrder.tableNumber || 1}]
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">صافي المبلغ المستحق للتحصيل:</span>
              <strong className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(payingOrder.totalAmount, settings.currency)}
              </strong>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">طريقة الدفع:</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPayOrderMethod(opt.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      payOrderMethod === opt.id
                        ? opt.accent
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(payOrderMethod === 'visa' ||
              payOrderMethod === 'instapay' ||
              payOrderMethod === 'ewallet') && (
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  رقم المرجع الإلكتروني (اختياري):
                </label>
                <input
                  type="text"
                  value={payOrderRef}
                  onChange={(e) => setPayOrderRef(e.target.value)}
                  placeholder="رقم مرجع التحويل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden"
                />
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
              >
                تأكيد التحصيل وطباعة الفاتورة
              </button>
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: FAST ITEM KITCHEN NOTE POPUP */}
      {editingItemNoteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-black text-white">
                  ملاحظة تحضير خاصة للمطبخ: {cart[editingItemNoteIndex]?.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemNoteIndex(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                عبارات وتوجيهات سريعة للمطبخ:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_KITCHEN_NOTES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const next = itemNoteInput ? `${itemNoteInput} ، ${preset}` : preset;
                      setItemNoteInput(next);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                نص الملاحظة المخصصة:
              </label>
              <input
                type="text"
                autoFocus
                value={itemNoteInput}
                onChange={(e) => setItemNoteInput(e.target.value)}
                placeholder="اكتب أي توجيه إضافي للمطبخ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSaveItemNote(itemNoteInput)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
              >
                تطبيق الملاحظة
              </button>
              <button
                type="button"
                onClick={() => handleSaveItemNote('')}
                className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer"
              >
                مسح الملاحظة
              </button>
              <button
                type="button"
                onClick={() => setEditingItemNoteIndex(null)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DRIVER CUSTODY SETTLEMENT */}
      {showDriverCustodyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    إدارة عهدة ونقدية طيارين الدليفري
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    متابعة التحصيلات وتوريد النقدية المعلقة لدرج الكاشير
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriverCustodyModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {settleErr && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                {settleErr}
              </div>
            )}

            {!settleDriver ? (
              <div className="space-y-3">
                {deliveryDrivers.map((drv) => (
                  <div
                    key={drv.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-white text-sm">{drv.name}</strong>
                        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
                          {drv.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        الطلبات النشطة: {drv.currentOrdersCount} · إجمالي المسلم: {drv.totalDeliveredCount || 0}
                      </div>
                    </div>

                    <div className="text-left flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block">العهدة المعلقة:</span>
                        <strong
                          className={`font-mono text-base font-black ${
                            drv.cashInCustodyMinor > 0 ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {formatCurrency(drv.cashInCustodyMinor, settings.currency)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        disabled={drv.cashInCustodyMinor <= 0}
                        onClick={() => {
                          setSettleDriver(drv);
                          setSettleAmountStr((drv.cashInCustodyMinor / 100).toFixed(2));
                          setSettleNotes('');
                        }}
                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-xs"
                      >
                        توريد نقدية
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleConfirmSettleDriver} className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                  <span>الطيار: <strong>{settleDriver.name}</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">
                    إجمالي العهدة: {formatCurrency(settleDriver.cashInCustodyMinor, settings.currency)}
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    المبلغ المورّد نقداً لدرج الكاشير ({settings.currency}): *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    min="0.1"
                    value={settleAmountStr}
                    onChange={(e) => setSettleAmountStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">ملاحظات التوريد:</label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="توريد نقدية أوردرات الغداء..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                  >
                    تأكيد الاستلام وإصدار سند القبض
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleDriver(null)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INSPECT DISH RECIPE & COST */}
      {inspectingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-black text-white">{inspectingDish.name}</h4>
                  <span className="text-[11px] text-slate-400">
                    ارتباط الطبق بالخامات والمخزون والتكلفة المعيارية
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDish(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!inspectingDish.ingredients || inspectingDish.ingredients.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                لم يتم ربط مكونات مخزنية فرعية لهذا الطبق بعد (يمكن إضافتها من شاشة الإدارة).
              </p>
            ) : (
              <div className="space-y-2">
                {inspectingDish.ingredients.map((ing, i) => {
                  const inv = inventory.find((x) => x.id === ing.inventoryItemId);
                  const lineCost = inv ? Math.round(inv.unitCost * ing.qty) : 0;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{ing.itemName}</span>
                        <span className="text-[11px] text-slate-400">
                          الرصيد بالمخزن: {inv ? `${inv.currentStock} ${inv.unit}` : 'غير متوفر'}
                        </span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-amber-400 font-bold block">
                          {ing.qty} {ing.unit}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          التكلفة: {formatCurrency(lineCost, settings.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">سعر البيع</span>
                <strong className="font-mono text-white">
                  {formatCurrency(inspectingDish.sellingPrice, settings.currency)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">التكلفة المعيارية</span>
                <strong className="font-mono text-amber-400">
                  {formatCurrency(inspectingDish.theoreticalCost, settings.currency)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">هامش الربح</span>
                <strong className="font-mono text-emerald-400">
                  {formatCurrency(
                    inspectingDish.sellingPrice - inspectingDish.theoreticalCost,
                    settings.currency
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK CUSTOMER DEBT COLLECTION */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={(e) => handleCollectCustomerDebt(e, true)}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-black text-white">
                  سند تحصيل نقدية من عميل آجل (يدخل درج الكاشير)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {collectErr && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                {collectErr}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">اختر العميل:</label>
              <select
                required
                value={collectCustId}
                onChange={(e) => setCollectCustId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="">— اختر العميل —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — المديونية الحالية: {formatCurrency(c.currentDebt, settings.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                المبلغ المحصل نقداً ({settings.currency}):
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={collectAmountStr}
                onChange={(e) => setCollectAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">البيان / ملاحظات:</label>
              <input
                type="text"
                value={collectDesc}
                onChange={(e) => setCollectDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="تحصيل دفعة من الحساب الآجل..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>تحصيل ومعاينة طباعة السند</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: QUICK RESTRICTED CUSTOMER REGISTRATION */}
      <QuickCustomerModal
        isOpen={showQuickCustomerModal}
        onClose={() => setShowQuickCustomerModal(false)}
        onCustomerCreated={(newCustomer) => {
          setSelectedCustomerId(newCustomer.id);
          setSuccessBanner(`تم تسجيل العميل "${newCustomer.name}" وتعيينه للطلب.`);
          setTimeout(() => setSuccessBanner(''), 4000);
          onRefresh();
        }}
      />

      {/* MODAL: PROMOTIONS PICKER */}
      <PromotionsPickerModal
        isOpen={showPromotionsPicker}
        onClose={() => setShowPromotionsPicker(false)}
        promotions={promotions}
        cart={cart}
        subtotalMinor={subtotalMinor}
        currency={settings.currency}
        activePromoCode={appliedPromotion?.code}
        onApplyPromotion={handleApplyPromotion}
        onRemovePromotion={handleRemovePromotion}
      />
    </div>
  );
};
