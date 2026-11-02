export type BusinessType = 'restaurant' | 'retail';

export type BusinessSpecialtyProfile =
  | 'restaurant'
  | 'supermarket'
  | 'pet_store'
  | 'apparel'
  | 'pharmacy'
  | 'electronics'
  | 'service_center'
  | 'beauty_clinic'
  | 'laundry'
  | 'general_retail';

export type UserRole = 'cashier' | 'accountant' | 'manager' | 'partner';

export type PartyType = 'partner' | 'employee' | 'supplier' | 'customer' | 'general';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus =
  | 'in_kitchen'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'paid' | 'unpaid';

export interface KitchenStation {
  id: string;
  code: string;
  name: string;
  colorBadge: string;
  iconType?: 'grill' | 'sandwich' | 'drink' | 'oven' | 'salad';
  isActive: boolean;
}

export interface DeliveryDriver {
  id: string;
  code: string;
  name: string;
  phone: string;
  vehicleType?: string;
  isActive: boolean;
  currentOrdersCount: number;
  totalDeliveredCount?: number;
  cashInCustodyMinor: number;
  notes?: string;
}

export type FinancialContainerType =
  | 'shift_drawer'
  | 'main_safe'
  | 'bank_account'
  | 'ewallet_instapay';

export type VoucherType =
  | 'expense'
  | 'receipt'
  | 'credit_purchase'
  | 'supplier_payment'
  | 'customer_collection'
  | 'partner_drawing'
  | 'partner_deposit'
  | 'staff_advance'
  | 'staff_custody_settlement'
  | 'payroll_payment';

export type PaymentMethod = 'cash' | 'visa' | 'instapay' | 'ewallet' | 'credit';

export interface RolePermissions {
  role: UserRole;
  labelAr: string;
  badgeColor: string;
  canSellPOS: boolean;
  canViewTheoreticalCost: boolean;
  canBlindCloseOnly: boolean;
  maxDirectExpenseMinor: number; // 0 = no limit
  canApproveHighVouchers: boolean;
  canIssuePartnerDrawings: boolean;
  canIssueStaffAdvances: boolean;
  canEditShiftSalesManually: boolean;
  canManageInventoryAndRecipes: boolean;
  canManageCreditLimits: boolean;
  canManageUsersAndRoles: boolean;
  canAccessAdminVault: boolean;
}

export interface AppUser {
  id: string;
  code: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  isActive: boolean;
  maxExpenseLimitMinor?: number; // overrides role default if set
  linkedPartnerId?: string;
  linkedEmployeeId?: string;
  notes?: string;
}

export interface Partner {
  id: string;
  code: string;
  name: string;
  phone: string;
  roleTitle: string; // e.g. شريك مؤسس ومدير تنفيذي / شريك ممول
  equityPercent: number; // e.g. 60
  capitalAmount: number; // minor units
  monthlyManagementSalary: number; // minor units (0 if passive investor)
  totalDeposits: number; // minor units (تمويلات وإيداعات جاري الشريك)
  totalDrawings: number; // minor units (مسحوبات الشريك النقدية والعينية)
  currentBalance: number; // minor units (صافي جاري الشريك = الإيداعات + الرواتب المستحقة - المسحوبات)
  isActive: boolean;
  notes?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  jobTitle: string;
  phone: string;
  monthlySalary: number; // minor units
  currentAdvances: number; // minor units (السلف المسحوبة خلال الفترة)
  custodyBalance: number; // minor units (عهدة مشتريات مؤقتة طرف الموظف)
  isActive: boolean;
  notes?: string;
  nationalId?: string;
  hireDate?: string;
  shiftHoursPerDay?: number; // default 8 or 10
  commissionRatePercent?: number; // e.g. 1.5 for 1.5% of sales
  perDeliveryCommissionMinor?: number; // e.g. 500 for 5 EGP per delivered order
  linkedUserId?: string;
  linkedDriverId?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  branchName: string;
  phone: string;
  address: string;
  taxNumber?: string;
  currency: string;
  footerNote: string;
  logoBase64?: string;
  businessType: BusinessType;
  specialtyProfile?: BusinessSpecialtyProfile;
  isOnboarded: boolean;
  adminPin?: string;
  defaultPrintFormat?: 'thermal' | 'standard';
  enforceBlindCloseForCashier?: boolean;
  businessId?: string;
  defaultCashierExpenseLimitMinor?: number;
}

export interface TenantBusiness {
  id: string; // e.g. "biz-main" or "biz-1730000000000"
  name: string;
  branchName: string;
  businessType: BusinessType;
  specialtyProfile?: BusinessSpecialtyProfile;
  currency: string;
  phone?: string;
  address?: string;
  createdAt: string;
  lastOpenedAt: string;
}

export interface BusinessBackupBundle {
  version: string;
  exportDate: string;
  business: TenantBusiness;
  settings: RestaurantSettings;
  categories: AccountCategory[];
  inventory: InventoryItem[];
  menuItems: MenuItem[];
  suppliers: Supplier[];
  customers: Customer[];
  shifts: Shift[];
  vouchers: Voucher[];
  saleOrders: SaleOrder[];
  promotions: Promotion[];
  users: AppUser[];
  partners: Partner[];
  employees: Employee[];
  kitchenStations?: KitchenStation[];
  deliveryDrivers?: DeliveryDriver[];
  wasteLogs?: WasteLog[];
  auditLogs?: AuditCorrectionLog[];
  attendanceLogs?: AttendanceRecord[];
  hrAdjustments?: HRAdjustment[];
  payrollSettlements?: PayrollSettlement[];
  petProfiles?: PetProfile[];
  serviceTickets?: ServiceTicket[];
}

export interface AccountCategory {
  id: string;
  code: string;
  name: string;
  type: 'expense' | 'receipt';
  linkedPartyType?: PartyType;
  description?: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  shiftId: string;
  type: VoucherType;
  date: string;
  time: string;
  amount: number; // stored in minor units (piastres, e.g. 10000 = 100.00 EGP)
  accountCode: string;
  accountName: string;
  recipient: string;
  description: string;
  cashierName: string;
  partyType?: PartyType;
  partyId?: string;
  supplierId?: string;
  customerId?: string;
  partnerId?: string;
  employeeId?: string;
  partyBalanceAfter?: number; // minor units
  financialContainer?: FinancialContainerType;
  performedByUserId?: string;
  performedByRole?: UserRole;
  approvedByUserName?: string;
  invoiceNo?: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  reversedByVoucherId?: string;
  reversesVoucherId?: string;
}

export interface Shift {
  id: string;
  shiftNumber: number;
  cashierName: string;
  date: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  openingCustody: number; // minor units
  cashSales: number; // minor units
  visaSales: number; // minor units
  instapaySales?: number; // minor units
  ewalletSales?: number; // minor units
  creditSales?: number; // minor units
  actualCountedCash?: number; // minor units
  variance?: number; // minor units
  closingNotes?: string;
}

export interface ShiftCashCalculation {
  openingCustody: number;
  cashSales: number;
  visaSales: number;
  instapaySales: number;
  ewalletSales: number;
  creditSales: number;
  totalSales: number;
  totalElectronicSales: number;
  totalReceipts: number; // receipt + customer_collection
  totalExpenses: number; // expense + supplier_payment
  totalCreditPurchases: number; // credit_purchase (non-cash)
  expectedCashInDrawer: number;
}

export interface ApparelVariant {
  id: string;
  size: string; // e.g. 'S', 'M', 'L', 'XL', 'XXL', '42', '44'
  color: string; // e.g. 'أسود', 'أبيض', 'كحلي', 'بيج'
  barcode?: string;
  stock: number;
  priceMinor?: number;
}

export interface PetProfile {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  species: 'قط' | 'كلب' | 'طائر' | 'أخرى';
  breed: string;
  ageLabel: string;
  weightKg: number;
  lastVaccineDate?: string;
  nextVaccineDate?: string;
  nextGroomingDate?: string;
  medicalAndDietNotes?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  unitCost: number; // minor units
  salePrice?: number; // minor units (for retail mode)
  lastUpdated: string;

  // Specialized Retail Vertical Fields
  barcode?: string;
  expiryDate?: string; // YYYY-MM-DD (Pharmacy, Supermarket, Pet Store)
  batchNumber?: string; // رقم التشغيلة
  activeIngredient?: string; // المادة الفعالة والتركيز (Pharmacy)
  dosageInstruction?: string; // الجرعة الإرشادية (Pharmacy)
  subUnitName?: string; // مثلاً 'شريط' في الصيدلية أو 'كجم فرط' في متجر الأليف
  subUnitsPerPack?: number; // عدد الشرائط بالعلبة (مثلاً 3)
  packUnitName?: string; // مثلاً 'كرتونة' أو 'شكارة'
  packConversionFactor?: number; // مثلاً 24 قطعة في الكرتونة أو 20 كجم في الشكارة
  packSalePrice?: number; // سعر بيع الكرتونة أو الشكارة كاملة (minor units)
  isWeightedScaleItem?: boolean; // صنف ميزان إلكتروني وباركود 21
  scalePluCode?: string; // كود الميزان من 5 أرقام مثل 00101
  variants?: ApparelVariant[]; // مصفوفة المقاسات والألوان للملابس والأحذية
  season?: 'summer' | 'winter' | 'all_season';
  petSpecies?: 'cat' | 'dog' | 'bird' | 'all';
  isServiceItem?: boolean; // خدمة شاور/حلاقة/فندقة/صيانة/جلسة تجميل/غسيل
  serialNumbers?: string[]; // أرقام السيريال والـ IMEI المتاحة بالمخزن للإلكترونيات والموبايلات
  warrantyMonths?: number; // فترة الضمان بالشهور (مثلاً 12 شهر)
  serviceDurationMinutes?: number; // مدة الجلسة أو الخدمة بالدقائق
}

export interface ServiceTicketPart {
  inventoryItemId: string;
  itemName: string;
  qty: number;
  unitPriceMinor: number;
  unitCostMinor: number;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string; // مثلاً SRV-1001 أو BKG-2001 أو LND-3001
  ticketType: 'repair' | 'appointment' | 'laundry';
  customerName: string;
  customerPhone: string;
  itemOrServiceTitle: string; // اسم الجهاز أو الجلسة أو القطع المستلمة
  serialOrTagNumber?: string; // السيريال IMEI أو رقم تاج الملابس أو الغرفة/الكرسي
  problemOrNotes?: string; // وصف العطل أو تفاصيل الخدمة أو الباقة
  assignedEmployeeId?: string;
  assignedEmployeeName?: string; // الفني أو الأخصائي المسؤول
  appointmentDate?: string; // تاريخ الموعد أو التسليم المتوقع
  appointmentTime?: string;
  status: 'received' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  serviceFeeMinor: number; // مصنعية الصيانة أو سعر الجلسة أو الغسيل
  partsUsed?: ServiceTicketPart[]; // قطع الغيار أو الخامات المسحوبة
  depositPaidMinor: number; // العربون المدفوع مقدماً
  totalAmountMinor: number; // الإجمالي الكلي (المصنعية + قطع الغيار)
  packageRemainingSessions?: number; // رصيد جلسات الباقة المتبقي للبيوتي والعيادات
  isSettled?: boolean;
  settledOrderId?: string;
  createdAt: string;
}

export interface WasteLog {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  qty: number;
  unitCost: number;
  totalLoss: number;
  reason: string;
  date: string;
  recordedBy: string;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  qty: number;
  unitCostSnapshot?: number;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: string;
  sellingPrice: number; // minor units
  theoreticalCost: number; // minor units
  ingredients?: RecipeIngredient[];
  active?: boolean;
  kitchenStationId?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  supplyCategory: string;
  creditBalance: number; // minor units (amount owed TO supplier)
  notes?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  allowCredit: boolean;
  creditLimit: number; // minor units (0 = unlimited when allowCredit is true)
  currentDebt: number; // minor units (amount owed BY customer)
  notes?: string;
}

export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'bogo'
  | 'category_deal';

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  type: PromotionType;
  discountValue: number; // percentage (e.g. 15 for 15%) or minor units (e.g. 3000 for 30 EGP)
  minOrderAmount: number; // minor units
  maxDiscountCap?: number; // minor units (limit for percentage discount)
  applicableMenuItemId?: string; // for dish-specific or BOGO
  applicableCategory?: string; // for category-specific deals
  bogoBuyQty?: number; // e.g. 1 or 2
  bogoGetQty?: number; // e.g. 1
  bogoDiscountPercent?: number; // 100 = free, 50 = 50% off
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  usageCount: number;
  badge?: string; // e.g. 'خصم ترحيبي', 'عرض الأسبوع', 'وفر أكثر'
}

export interface SaleOrderLine {
  menuItemId: string;
  code: string;
  menuItemName: string;
  qty: number;
  unitPrice: number; // minor units
  unitTheoreticalCost: number; // minor units
  totalPrice: number; // minor units
  totalTheoreticalCost: number; // minor units
  kitchenStationId?: string;
  kitchenStationName?: string;
  notes?: string; // e.g. "بدون بصل / تسوية زيادة"
  isReady?: boolean;
}

export interface SaleOrder {
  id: string;
  orderNumber: string;
  shiftId: string;
  date: string;
  time: string;
  cashierName: string;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerBalanceAfter?: number; // minor units
  lines: SaleOrderLine[];
  subtotal: number; // minor units
  discount: number; // minor units
  couponCode?: string;
  promotionTitle?: string;
  promotionDiscount?: number; // minor units
  totalAmount: number; // minor units
  totalTheoreticalCost: number; // minor units
  notes?: string;

  // Order Type & Dining Tables
  orderType: OrderType; // 'dine_in' | 'takeaway' | 'delivery'
  tableNumber?: string; // e.g. "T-01" or "طاولة 4"
  tableGuests?: number;

  // Delivery & Courier Info
  deliveryFee?: number; // minor units
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;

  // Workflow & Kitchen KOT
  orderStatus: OrderStatus; // 'in_kitchen' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
  paymentStatus: PaymentStatus; // 'paid' | 'unpaid'
  kotPrinted?: boolean;
  kotPrintTime?: string;
  kotPrintCount?: number;
  dailySequenceNumber?: number; // رقم تسلسلي بسيط للنداء مثلا #1, #2...
  isReversed?: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  inventoryRestoredOnReversal?: boolean;
}

export interface AuditCorrectionLog {
  id: string;
  correctionNumber: string; // e.g. REV-0001
  date: string;
  time: string;
  targetType: 'sale_order' | 'voucher' | 'inventory' | 'shift';
  originalRecordId: string;
  originalRecordNumber: string;
  reversalRecordNumber?: string;
  amountMinor: number; // financial impact in minor units
  reason: string;
  performedByName: string;
  performedByRole?: UserRole;
  inventoryRestored?: boolean;
  detailsSummary: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  jobTitle?: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workedHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status: 'present' | 'late' | 'absent' | 'leave';
  shiftId?: string;
  notes?: string;
}

export interface HRAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  month: string; // YYYY-MM
  type: 'bonus' | 'deduction' | 'commission' | 'overtime_pay';
  amountMinor: number;
  reason: string;
  recordedBy: string;
  isSettledInPayroll?: boolean;
  payrollId?: string;
}

export interface PayrollSettlement {
  id: string;
  payrollNumber: string; // PAY-2026-11-01
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  month: string; // YYYY-MM
  date: string;
  time: string;
  baseSalaryMinor: number;
  bonusesMinor: number;
  commissionsMinor: number;
  overtimeMinor: number;
  deductionsMinor: number;
  advancesDeductedMinor: number;
  netPaidMinor: number;
  financialContainer: FinancialContainerType;
  voucherId: string;
  voucherNumber: string;
  paidBy: string;
  notes?: string;
}

export type ExtendedFinancialContainerType =
  | 'shift_drawer'
  | 'main_safe'
  | 'bank_account'
  | 'ewallet_instapay'
  | 'driver_custody'
  | 'partner_equity';

export interface BusinessInsight {
  id: string;
  type: 'bundle' | 'margin_leak' | 'cost_waste' | 'retention';
  priority: 'high' | 'medium' | 'opportunity';
  title: string;
  description: string;
  financialImpactMinor: number;
  actionLabel?: string;
  actionPayload?: {
    suggestedPromo?: Partial<Promotion>;
    suggestedPriceAdjustment?: {
      itemId: string;
      currentPriceMinor: number;
      recommendedPriceMinor: number;
    };
    suggestedCustomerPhone?: string;
  };
}

export interface DeadStockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  unitCost: number;
  salePrice?: number;
  tiedCapitalMinor: number;
  lastSoldDate?: string;
  daysIdle: number;
  velocityClass: 'fast_a' | 'medium_b' | 'dead_c';
  associatedCustomerCount?: number;
}

export interface PetFeedingCycle {
  id: string;
  petProfileId: string;
  petName: string;
  customerName: string;
  customerPhone: string;
  foodItemId: string;
  foodItemName: string;
  bagWeightKg: number;
  dailyGramsEstimated: number;
  purchaseDate: string;
  estimatedDepletionDate: string;
  reminderStatus: 'active' | 'depleted' | 'reminded';
}

export interface DriverSettlementRecord {
  id: string;
  settlementNumber: string;
  driverId: string;
  driverName: string;
  date: string;
  time: string;
  ordersDeliveredCount: number;
  totalCollectedCashMinor: number;
  commissionEarnedMinor: number;
  netTurnedOverToSafeMinor: number;
  voucherId?: string;
  settledBy: string;
}



