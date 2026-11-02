import React, { useMemo, useState } from 'react';
import {
  Customer,
  DeliveryDriver,
  InventoryItem,
  MenuItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PetProfile,
  RestaurantSettings,
  SaleOrder,
  ServiceTicket,
  Shift,
} from '../types';
import {
  formatCurrency,
  getCurrentTimeString,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getTodayDateString,
  StorageService,
} from '../services/storage';
import {
  AlertCircle,
  Banknote,
  Bike,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  HeartHandshake,
  Minus,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  activeShift: Shift;
  inventory: InventoryItem[];
  menuItems: MenuItem[];
  customers: Customer[];
  onOrderCompleted: (order: SaleOrder) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export const MobileQuickPOSView: React.FC<Props> = ({
  settings,
  activeShift,
  inventory,
  menuItems,
  customers,
  onOrderCompleted,
  onClose,
  onRefresh,
}) => {
  const isRetail = settings.businessType === 'retail';
  const currency = settings.currency;

  const [activeTab, setActiveTab] = useState<
    'quick_pos' | 'driver_orders' | 'tickets_packages' | 'shift_custody'
  >('quick_pos');

  // Quick POS Cart State
  const [cart, setCart] = useState<{
    item: MenuItem;
    qty: number;
    notes?: string;
  }[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Driver orders state
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [deliveryDrivers, setDeliveryDrivers] = useState<DeliveryDriver[]>(() =>
    StorageService.getDeliveryDrivers()
  );
  const [allOrders, setAllOrders] = useState<SaleOrder[]>(() =>
    StorageService.getSaleOrders()
  );

  // Tickets & Packages state
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>(() =>
    StorageService.getServiceTickets()
  );
  const [ticketSearch, setTicketSearch] = useState<string>('');

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const sellableItems: MenuItem[] = useMemo(() => {
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
    sellableItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['all', ...Array.from(set)];
  }, [sellableItems]);

  const filteredItems = useMemo(() => {
    return sellableItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [sellableItems, selectedCategory, searchQuery]);

  const cartTotalMinor = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.item.sellingPrice * c.qty, 0);
  }, [cart]);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const nextQty = c.qty + delta;
            return nextQty > 0 ? { ...c, qty: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as { item: MenuItem; qty: number }[];
    });
  };

  // Instant Quick Checkout from Phone
  const handleQuickCheckout = () => {
    if (cart.length === 0) {
      showToast('⚠️ السلة فارغة، يرجى اختيار صنف للبيع');
      return;
    }

    try {
      const createdOrder = StorageService.createSaleOrder({
        shiftId: activeShift.id,
        cashierName: activeShift.cashierName,
        orderType: 'takeaway',
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        paymentMethod,
        lines: cart.map((c) => ({
          menuItemId: c.item.id,
          qty: c.qty,
          notes: c.notes,
        })),
        discountMinor: 0,
        notes: 'تم البيع عبر وضع الجوال السريع',
      });

      setCart([]);
      setAllOrders(StorageService.getSaleOrders());
      showToast(`✅ تم تحصيل فاتورة #${createdOrder.orderNumber} بنجاح (${formatCurrency(createdOrder.totalAmount, currency)})`);
      onOrderCompleted(createdOrder);
      onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ أثناء البيع');
    }
  };

  // Driver Orders Filter
  const driverOrdersList = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.orderType === 'delivery' &&
        o.orderStatus !== 'cancelled' &&
        (!selectedDriverId || o.deliveryDriverId === selectedDriverId)
    );
  }, [allOrders, selectedDriverId]);

  // Handle Mark Delivered by Driver
  const handleDeliverOrderByDriver = (orderId: string) => {
    try {
      const order = allOrders.find((o) => o.id === orderId);
      if (!order) return;

      StorageService.updateOrderStatus(orderId, 'delivered');

      // If unpaid, mark as paid in driver's custody
      if (order.paymentStatus === 'unpaid') {
        StorageService.payAndCloseOrder({
          orderId,
          paymentMethod: 'cash',
          cashierName: activeShift.cashierName,
        });

        // Add to driver's cash custody
        if (order.deliveryDriverId) {
          const drivers = StorageService.getDeliveryDrivers();
          const updated = drivers.map((d) =>
            d.id === order.deliveryDriverId
              ? {
                  ...d,
                  cashInCustodyMinor:
                    (d.cashInCustodyMinor || 0) + order.totalAmount,
                  currentOrdersCount: (d.currentOrdersCount || 0) + 1,
                }
              : d
          );
          StorageService.saveDeliveryDrivers(updated);
          setDeliveryDrivers(updated);
        }
      }

      setAllOrders(StorageService.getSaleOrders());
      showToast(`🛵 تم تسليم الطلب #${order.orderNumber} وتحصيل ${formatCurrency(order.totalAmount, currency)} في عهدة الطيار`);
      onRefresh();
    } catch {
      showToast('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  // Settle driver shift from mobile
  const handleSettleDriverCustody = (driverId: string) => {
    try {
      const drv = deliveryDrivers.find((d) => d.id === driverId);
      if (!drv || drv.cashInCustodyMinor <= 0) {
        showToast('لا توجد عهدة نقدية قائمة لهذا السائق للتصفية');
        return;
      }

      const settlement = StorageService.settleDriverShift({
        driverId,
        settledBy: activeShift.cashierName,
        notes: 'تصفية عهدة وردية الدليفري من الجوال',
      });

      setDeliveryDrivers(StorageService.getDeliveryDrivers());
      showToast(`💰 تم تصفية عهدة (${drv.name}) بقيمة ${formatCurrency(settlement.totalCollectedCashMinor, currency)} وتوريدها للخزينة!`);
      onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ في التصفية');
    }
  };

  // Deduct Salon / Clinic Package Session
  const handleDeductSession = (ticketId: string) => {
    try {
      const updated = serviceTickets.map((t) => {
        if (t.id !== ticketId || !t.packageRemainingSessions) return t;
        return {
          ...t,
          packageRemainingSessions: Math.max(0, t.packageRemainingSessions - 1),
        };
      });
      StorageService.saveServiceTickets(updated);
      setServiceTickets(updated);
      showToast('💆‍♀️ تم خصم جلسة بنجاح وتحديث الرصيد المتبقي للباقة');
      onRefresh();
    } catch {
      showToast('حدث خطأ أثناء خصم الجلسة');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-3 left-4 right-4 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs leading-snug">{feedback}</span>
        </div>
      )}

      {/* TOP COMPACT APP BAR (≤ 54px) */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
            ⚡
          </div>
          <div>
            <div className="text-sm font-black text-white leading-tight">
              {settings.restaurantName || 'FastRest POS'}
            </div>
            <div className="text-[10px] text-amber-400 font-mono">
              وضع الجوال السريع · وردية #{activeShift.shiftNumber}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center active:bg-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center active:bg-rose-500/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 overflow-y-auto pb-20 p-3">
        {/* TAB 1: QUICK TOUCH POS */}
        {activeTab === 'quick_pos' && (
          <div className="space-y-3">
            {/* Search & Categories Bar */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الباركود..."
                  className="bg-transparent text-sm text-white w-full focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills Scroller */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 px-3.5 rounded-xl font-bold whitespace-nowrap min-h-[40px] transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {cat === 'all' ? 'جميع الأصناف' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Sellable Items Grid (Large Touch Targets >= 48px) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className={`p-3 rounded-2xl border text-right flex flex-col justify-between min-h-[88px] active:scale-[0.98] transition-transform cursor-pointer ${
                      inCart
                        ? 'bg-amber-500/15 border-amber-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 active:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white line-clamp-2 leading-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                      <span className="font-mono font-black text-amber-400 text-xs">
                        {formatCurrency(item.sellingPrice, currency)}
                      </span>
                      {inCart && (
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cart Drawer & Checkout Bar */}
            {cart.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">
                      السلة الحالية ({cart.reduce((s, c) => s + c.qty, 0)} قطعة)
                    </span>
                  </div>
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-rose-400 hover:underline font-bold"
                  >
                    مسح السلة
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {cart.map((c) => (
                    <div
                      key={c.item.id}
                      className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs"
                    >
                      <div className="truncate max-w-[140px] font-bold text-white">
                        {c.item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-bold">
                          {formatCurrency(c.item.sellingPrice * c.qty, currency)}
                        </span>
                        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                          <button
                            onClick={() => handleUpdateQty(c.item.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold w-5 text-center text-xs">
                            {c.qty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(c.item.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-amber-500 text-slate-950"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['cash', 'visa', 'instapay'] as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold cursor-pointer text-center ${
                          paymentMethod === method
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-950 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {getPaymentMethodLabel(method)}
                      </button>
                    )
                  )}
                </div>

                {/* Big Instant Pay Button (Hitbox >= 48px) */}
                <button
                  type="button"
                  onClick={handleQuickCheckout}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black rounded-xl text-sm flex items-center justify-between px-4 shadow-lg cursor-pointer transition-transform"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تحصيل وإنهاء الفاتورة</span>
                  </span>
                  <span className="font-mono text-base font-black">
                    {formatCurrency(cartTotalMinor, currency)}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DRIVER DELIVERIES & DISPATCH */}
        {activeTab === 'driver_orders' && (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">
                تصفية الطلبات حسب السائق / الطيار:
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">جميع كباتن الدليفري ({deliveryDrivers.length})</option>
                {deliveryDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — العهدة: {formatCurrency(d.cashInCustodyMinor || 0, currency)} ({d.currentOrdersCount} طلب)
                  </option>
                ))}
              </select>
            </div>

            {/* Orders Feed */}
            <div className="space-y-2.5">
              {driverOrdersList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  لا توجد طلبات توصيل مسجلة حالياً
                </div>
              ) : (
                driverOrdersList.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-400 text-sm">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          order.orderStatus === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {getOrderStatusLabel(order.orderStatus)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          العميل: {order.customerName || 'عميل نقدي'}
                        </span>
                        {order.deliveryPhone && (
                          <a
                            href={`tel:${order.deliveryPhone}`}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg font-bold text-[11px]"
                          >
                            <Phone className="w-3 h-3" />
                            <span>اتصال ({order.deliveryPhone})</span>
                          </a>
                        )}
                      </div>
                      {order.deliveryAddress && (
                        <div className="text-[11px] text-slate-400">
                          📍 العنوان: {order.deliveryAddress}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        🛵 الطيار: {order.deliveryDriverName || 'غير مسند'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">المبلغ المطلوب تحصيله:</div>
                        <div className="text-sm font-black font-mono text-emerald-400">
                          {formatCurrency(order.totalAmount, currency)}
                        </div>
                      </div>

                      {order.orderStatus !== 'delivered' && (
                        <button
                          type="button"
                          onClick={() => handleDeliverOrderByDriver(order.id)}
                          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم التسليم والتحصيل</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TICKETS & PACKAGES (SALON / CLINIC / PETS) */}
        {activeTab === 'tickets_packages' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-800 text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="بحث برقم التذكرة أو اسم العميل..."
                className="bg-transparent text-white w-full focus:outline-hidden"
              />
            </div>

            <div className="space-y-2.5">
              {serviceTickets
                .filter(
                  (t) =>
                    !ticketSearch ||
                    t.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                    t.customerName.toLowerCase().includes(ticketSearch.toLowerCase())
                )
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-400 text-xs">
                        {ticket.ticketNumber} · {ticket.itemOrServiceTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          ticket.status === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ticket.status === 'delivered' ? 'مكتمل' : 'قيد التشغيل'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <div>العميل: <span className="font-bold text-white">{ticket.customerName}</span> ({ticket.customerPhone})</div>
                      {ticket.assignedEmployeeName && (
                        <div className="text-sky-300 text-[11px]">الأخصائي: {ticket.assignedEmployeeName}</div>
                      )}
                      {ticket.packageRemainingSessions !== undefined && (
                        <div className="text-purple-300 font-bold text-[11px]">
                          رصيد الجلسات المتبقية بالباقة: {ticket.packageRemainingSessions} جلسة
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div className="font-mono font-bold text-xs text-white">
                        الإجمالي: {formatCurrency(ticket.totalAmountMinor, currency)}
                      </div>

                      {ticket.packageRemainingSessions && ticket.packageRemainingSessions > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleDeductSession(ticket.id)}
                          className="py-2 px-3 bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>خصم جلسة الآن</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: SHIFT & DRIVER CUSTODY MANAGEMENT */}
        {activeTab === 'shift_custody' && (
          <div className="space-y-3.5">
            {/* Shift Balance Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>حساب الوردية والدرج النقدي الحالي</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">العهدة الافتتاحية:</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {formatCurrency(activeShift.openingCustody, currency)}
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">مبيعات الكاش بالوردية:</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    {formatCurrency(activeShift.cashSales, currency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Drivers Live Custody Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-400" />
                <span>عهد سائقي التوصيل المحصلة ({deliveryDrivers.length})</span>
              </h4>

              <div className="space-y-2">
                {deliveryDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{driver.name}</div>
                      <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                        العهدة: {formatCurrency(driver.cashInCustodyMinor || 0, currency)} ({driver.currentOrdersCount} طلبات)
                      </div>
                    </div>

                    {driver.cashInCustodyMinor > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSettleDriverCustody(driver.id)}
                        className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer active:scale-95"
                      >
                        تصفية وتوريد
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR (Thumb Zone Ergonomics, Hitbox >= 48px) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center z-40 px-1">
        <button
          type="button"
          onClick={() => setActiveTab('quick_pos')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-colors ${
            activeTab === 'quick_pos'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-1" />
          <span className="text-[10px]">البيع السريع</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('driver_orders')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-colors ${
            activeTab === 'driver_orders'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-5 h-5 mb-1" />
          <span className="text-[10px]">طلبات الطيار</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tickets_packages')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-colors ${
            activeTab === 'tickets_packages'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-1" />
          <span className="text-[10px]">تذاكر وباقات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shift_custody')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] cursor-pointer transition-colors ${
            activeTab === 'shift_custody'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-5 h-5 mb-1" />
          <span className="text-[10px]">العهدة والوردية</span>
        </button>
      </nav>
    </div>
  );
};
