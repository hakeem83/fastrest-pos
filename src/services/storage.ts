import * as XLSX from 'xlsx';
import {
  AccountCategory,
  AppUser,
  BusinessBackupBundle,
  Customer,
  DeliveryDriver,
  Employee,
  FinancialContainerType,
  InventoryItem,
  KitchenStation,
  MenuItem,
  OrderStatus,
  OrderType,
  Partner,
  PartyType,
  PaymentMethod,
  PaymentStatus,
  Promotion,
  RestaurantSettings,
  RolePermissions,
  SaleOrder,
  Shift,
  ShiftCashCalculation,
  Supplier,
  TenantBusiness,
  UserRole,
  Voucher,
  VoucherType,
  WasteLog,
} from '../types';

const KEYS = {
  SETTINGS: 'fastrest_settings_v2',
  CATEGORIES: 'fastrest_categories_v2',
  SHIFTS: 'fastrest_shifts_v2',
  VOUCHERS: 'fastrest_vouchers_v2',
  INVENTORY: 'fastrest_inventory_v2',
  WASTE: 'fastrest_waste_v2',
  MENU_ITEMS: 'fastrest_menu_items_v2',
  SUPPLIERS: 'fastrest_suppliers_v2',
  CUSTOMERS: 'fastrest_customers_v2',
  SALE_ORDERS: 'fastrest_sale_orders_v2',
  PROMOTIONS: 'fastrest_promotions_v2',
  USERS: 'fastrest_users_v2',
  ACTIVE_USER_ID: 'fastrest_active_user_id_v2',
  PARTNERS: 'fastrest_partners_v2',
  EMPLOYEES: 'fastrest_employees_v2',
  BUSINESSES: 'fastrest_businesses_list_v2',
  ACTIVE_BUSINESS_ID: 'fastrest_active_business_id_v2',
  KITCHEN_STATIONS: 'fastrest_kitchen_stations_v2',
  DELIVERY_DRIVERS: 'fastrest_delivery_drivers_v2',
};

export function getOrderTypeLabel(type?: OrderType): string {
  switch (type) {
    case 'dine_in':
      return 'صالة (طاولة)';
    case 'delivery':
      return 'توصيل (دليفري)';
    case 'takeaway':
    default:
      return 'تيك أواي (استلام)';
  }
}

export function getOrderStatusLabel(status?: OrderStatus): string {
  switch (status) {
    case 'in_kitchen':
      return 'قيد التحضير بالمطبخ';
    case 'ready':
      return 'جاهز للتسليم';
    case 'out_for_delivery':
      return 'في الطريق مع الطيار';
    case 'delivered':
      return 'تم التسليم';
    case 'cancelled':
      return 'ملغي';
    default:
      return status || '';
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

export function formatCurrency(amountMinor: number, currency = 'ج.م'): string {
  const major = (amountMinor || 0) / 100;
  return `${major.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'نقداً (كاش)';
    case 'visa':
      return 'فيزا / بطاقة بنكية';
    case 'instapay':
      return 'إنستاباي (InstaPay)';
    case 'ewallet':
      return 'محفظة إلكترونية';
    case 'credit':
      return 'آجل (على حساب عميل مسجل)';
    default:
      return method;
  }
}

export function getRolePermissions(
  role: UserRole,
  customExpenseLimitMinor?: number
): RolePermissions {
  switch (role) {
    case 'cashier':
      return {
        role: 'cashier',
        labelAr: 'كاشير نقطة بيع',
        badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        canSellPOS: true,
        canViewTheoreticalCost: false,
        canBlindCloseOnly: true,
        maxDirectExpenseMinor:
          customExpenseLimitMinor !== undefined ? customExpenseLimitMinor : 20000, // 200 EGP
        canApproveHighVouchers: false,
        canIssuePartnerDrawings: false,
        canIssueStaffAdvances: false,
        canEditShiftSalesManually: false,
        canManageInventoryAndRecipes: false,
        canManageCreditLimits: false,
        canManageUsersAndRoles: false,
        canAccessAdminVault: false,
      };
    case 'accountant':
      return {
        role: 'accountant',
        labelAr: 'محاسب مالي ومخازن',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        canSellPOS: true,
        canViewTheoreticalCost: true,
        canBlindCloseOnly: false,
        maxDirectExpenseMinor:
          customExpenseLimitMinor !== undefined ? customExpenseLimitMinor : 250000, // 2,500 EGP
        canApproveHighVouchers: false,
        canIssuePartnerDrawings: true, // requires Partner/Manager PIN if > limit
        canIssueStaffAdvances: true,
        canEditShiftSalesManually: true,
        canManageInventoryAndRecipes: true,
        canManageCreditLimits: true,
        canManageUsersAndRoles: false,
        canAccessAdminVault: true,
      };
    case 'manager':
      return {
        role: 'manager',
        labelAr: 'مدير الفرع والتشغيل',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        canSellPOS: true,
        canViewTheoreticalCost: true,
        canBlindCloseOnly: false,
        maxDirectExpenseMinor:
          customExpenseLimitMinor !== undefined ? customExpenseLimitMinor : 1000000, // 10,000 EGP
        canApproveHighVouchers: true,
        canIssuePartnerDrawings: true,
        canIssueStaffAdvances: true,
        canEditShiftSalesManually: true,
        canManageInventoryAndRecipes: true,
        canManageCreditLimits: true,
        canManageUsersAndRoles: true,
        canAccessAdminVault: true,
      };
    case 'partner':
      return {
        role: 'partner',
        labelAr: 'شريك / مالك المنشأة',
        badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        canSellPOS: true,
        canViewTheoreticalCost: true,
        canBlindCloseOnly: false,
        maxDirectExpenseMinor: 0, // unlimited
        canApproveHighVouchers: true,
        canIssuePartnerDrawings: true,
        canIssueStaffAdvances: true,
        canEditShiftSalesManually: true,
        canManageInventoryAndRecipes: true,
        canManageCreditLimits: true,
        canManageUsersAndRoles: true,
        canAccessAdminVault: true,
      };
  }
}

export function getFinancialContainerLabel(container?: FinancialContainerType): string {
  switch (container) {
    case 'main_safe':
      return 'الخزينة الرئيسية للإدارة';
    case 'bank_account':
      return 'الحساب البنكي / فيزا';
    case 'ewallet_instapay':
      return 'محفظة إلكترونية / إنستاباي';
    case 'shift_drawer':
    default:
      return 'درج نقدية الكاشير (الوردية)';
  }
}

export function getPartyTypeLabel(partyType?: PartyType): string {
  switch (partyType) {
    case 'partner':
      return 'شريك / مالك';
    case 'employee':
      return 'موظف / عامل';
    case 'supplier':
      return 'مورد بضاعة وخامات';
    case 'customer':
      return 'عميل مسجل';
    case 'general':
    default:
      return 'حساب تشغيلي عام';
  }
}

export function getVoucherTypeLabel(type: VoucherType): string {
  switch (type) {
    case 'expense':
      return 'صرف مصروف تشغيلي';
    case 'supplier_payment':
      return 'سداد دفعة لمورد';
    case 'staff_advance':
      return 'صرف سلفة / راتب موظف';
    case 'partner_drawing':
      return 'مسحوبات شريك (جاري الشريك)';
    case 'receipt':
      return 'قبض نقدية عام';
    case 'customer_collection':
      return 'تحصيل مديونية عميل آجل';
    case 'partner_deposit':
      return 'إيداع / تمويل من شريك';
    case 'staff_custody_settlement':
      return 'رد / تسوية عهدة موظف';
    case 'credit_purchase':
      return 'فاتورة توريد بضاعة آجل';
    default:
      return type;
  }
}

const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantName: 'مطعم ومشويات الشرق الأصيل',
  branchName: 'الفرع الرئيسي - مدينة نصر',
  phone: '01001234567',
  address: 'شارع عباس العقاد، مدينة نصر، القاهرة',
  taxNumber: '412-889-105',
  currency: 'ج.م',
  footerNote: 'جميع الأسعار شاملة الضريبة · نتمنى لكم وجبة شهية',
  businessType: 'restaurant',
  isOnboarded: true,
  adminPin: '1234',
  defaultPrintFormat: 'thermal',
  enforceBlindCloseForCashier: true,
  defaultCashierExpenseLimitMinor: 20000, // 200 EGP
};

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr-cashier-1',
    code: 'USR-01',
    name: 'أحمد كمال',
    role: 'cashier',
    pin: '1111',
    phone: '01012340001',
    isActive: true,
    maxExpenseLimitMinor: 20000, // 200 EGP max petty cash without manager approval
    linkedEmployeeId: 'emp-2',
    notes: 'كاشير الفترة الصباحية - صلاحية بيع ومصروف نثري حتى 200 ج.م فقط',
  },
  {
    id: 'usr-accountant-1',
    code: 'USR-02',
    name: 'أ. سامح عبد العزيز',
    role: 'accountant',
    pin: '2222',
    phone: '01012340002',
    isActive: true,
    maxExpenseLimitMinor: 250000, // 2,500 EGP
    notes: 'المحاسب المالي ومراقب المخزون وحسابات الموردين والعملاء',
  },
  {
    id: 'usr-manager-1',
    code: 'USR-03',
    name: 'م. طارق المنشاوي',
    role: 'manager',
    pin: '3333',
    phone: '01012340003',
    isActive: true,
    maxExpenseLimitMinor: 1000000, // 10,000 EGP
    notes: 'مدير الفرع والتشغيل - معتمد المصروفات والسلف والخصومات',
  },
  {
    id: 'usr-partner-1',
    code: 'USR-04',
    name: 'أ. محمد حكيم',
    role: 'partner',
    pin: '1234',
    phone: '01001234567',
    isActive: true,
    maxExpenseLimitMinor: 0, // unlimited
    linkedPartnerId: 'prt-1',
    notes: 'الشريك المؤسس والمالك - كامل الصلاحيات واعتماد مسحوبات الشركاء',
  },
];

const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'prt-1',
    code: 'PRT-01',
    name: 'أ. محمد حكيم',
    phone: '01001234567',
    roleTitle: 'شريك مؤسس ومدير عام',
    equityPercent: 60,
    capitalAmount: 60000000, // 600,000 EGP
    monthlyManagementSalary: 1500000, // 15,000 EGP
    totalDeposits: 8500000, // 85,000 EGP
    totalDrawings: 3200000, // 32,000 EGP
    currentBalance: 5300000, // +53,000 EGP credit in partner current account
    isActive: true,
    notes: 'حصة 60% من رأس المال والأرباح + راتب إدارة شهري ثابت',
  },
  {
    id: 'prt-2',
    code: 'PRT-02',
    name: 'أ. خالد الشافعي',
    phone: '01229876543',
    roleTitle: 'شريك ممول (موصي)',
    equityPercent: 40,
    capitalAmount: 40000000, // 400,000 EGP
    monthlyManagementSalary: 0,
    totalDeposits: 4000000, // 40,000 EGP
    totalDrawings: 1500000, // 15,000 EGP
    currentBalance: 2500000, // +25,000 EGP credit in partner current account
    isActive: true,
    notes: 'حصة 40% من صافي الأرباح القابلة للتوزيع بعد خصم الاحتياطي',
  },
];

const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    code: 'EMP-01',
    name: 'الشيف حسن محمود',
    jobTitle: 'شيف مشويات رئيسي',
    phone: '01112223334',
    monthlySalary: 1200000, // 12,000 EGP
    currentAdvances: 150000, // 1,500 EGP advance
    custodyBalance: 0,
    isActive: true,
    notes: 'مسؤول قسم المشويات والتتبيل',
  },
  {
    id: 'emp-2',
    code: 'EMP-02',
    name: 'أحمد كمال',
    jobTitle: 'كاشير نقطة البيع',
    phone: '01012340001',
    monthlySalary: 750000, // 7,500 EGP
    currentAdvances: 50000, // 500 EGP advance
    custodyBalance: 0,
    isActive: true,
    notes: 'مسؤول وردية الكاشير الصباحية',
  },
  {
    id: 'emp-3',
    code: 'EMP-03',
    name: 'محمود سيد',
    jobTitle: 'مندوب مشتريات ومخازن',
    phone: '01554433221',
    monthlySalary: 700000, // 7,000 EGP
    currentAdvances: 0,
    custodyBalance: 100000, // 1,000 EGP custody for market purchases
    isActive: true,
    notes: 'يحمل عهدة شراء خضروات ولوازم طازجة يومية',
  },
  {
    id: 'emp-4',
    code: 'EMP-04',
    name: 'كريم عادل',
    jobTitle: 'عامل تجهيز وصالة',
    phone: '01200998877',
    monthlySalary: 550000, // 5,500 EGP
    currentAdvances: 30000, // 300 EGP
    custodyBalance: 0,
    isActive: true,
    notes: 'تجهيز الصالة والتغليف',
  },
];

const DEFAULT_CATEGORIES: AccountCategory[] = [
  { id: 'cat-1', code: 'EXP-101', name: 'مشتريات خامات ومطبخ طازجة', type: 'expense', linkedPartyType: 'general' },
  { id: 'cat-2', code: 'EXP-102', name: 'أجور ومرتبات وسلف العاملين', type: 'expense', linkedPartyType: 'employee' },
  { id: 'cat-3', code: 'EXP-103', name: 'كهرباء وغاز ومرافق تشغيل', type: 'expense', linkedPartyType: 'general' },
  { id: 'cat-4', code: 'EXP-104', name: 'عبوات تغليف وأكياس تيك أواي', type: 'expense', linkedPartyType: 'general' },
  { id: 'cat-5', code: 'EXP-105', name: 'سداد دفعات موردين آجل', type: 'expense', linkedPartyType: 'supplier' },
  { id: 'cat-9', code: 'EXP-106', name: 'مسحوبات جاري الشركاء والملاك', type: 'expense', linkedPartyType: 'partner' },
  { id: 'cat-6', code: 'REC-201', name: 'إيرادات تيك أواي / حفلات خارجية', type: 'receipt', linkedPartyType: 'general' },
  { id: 'cat-7', code: 'REC-202', name: 'تحصيل مديونية عملاء آجل', type: 'receipt', linkedPartyType: 'customer' },
  { id: 'cat-8', code: 'REC-203', name: 'إيداع وتمويل جاري الشركاء للخزينة', type: 'receipt', linkedPartyType: 'partner' },
  { id: 'cat-10', code: 'REC-204', name: 'رد وتسوية عهدة نقدية من موظف', type: 'receipt', linkedPartyType: 'employee' },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    code: 'ING-001',
    name: 'لحم بقري مفروم بلدي صافي',
    category: 'لحوم ودواجن',
    unit: 'كجم',
    currentStock: 35,
    minStockAlert: 8,
    unitCost: 36000, // 360 EGP/kg
    salePrice: 44000,
    lastUpdated: getTodayDateString(),
  },
  {
    id: 'inv-2',
    code: 'ING-002',
    name: 'صدور دجاج فيليه متبلة',
    category: 'لحوم ودواجن',
    unit: 'كجم',
    currentStock: 28,
    minStockAlert: 6,
    unitCost: 19500, // 195 EGP/kg
    salePrice: 24000,
    lastUpdated: getTodayDateString(),
  },
  {
    id: 'inv-3',
    code: 'ING-003',
    name: 'أرز بسمتي هندي ذهبي',
    category: 'بقوليات وجاف',
    unit: 'كجم',
    currentStock: 50,
    minStockAlert: 10,
    unitCost: 7500, // 75 EGP/kg
    salePrice: 9500,
    lastUpdated: getTodayDateString(),
  },
  {
    id: 'inv-4',
    code: 'ING-004',
    name: 'خبز صاج شاورما / تورتيلا كبير',
    category: 'مخبوزات',
    unit: 'قطعة',
    currentStock: 180,
    minStockAlert: 40,
    unitCost: 350, // 3.50 EGP/pc
    salePrice: 500,
    lastUpdated: getTodayDateString(),
  },
  {
    id: 'inv-5',
    code: 'ING-005',
    name: 'بطاطس نصف مقلية فارم',
    category: 'مجمدات',
    unit: 'كجم',
    currentStock: 42,
    minStockAlert: 10,
    unitCost: 5800, // 58 EGP/kg
    salePrice: 7500,
    lastUpdated: getTodayDateString(),
  },
  {
    id: 'inv-6',
    code: 'ING-006',
    name: 'عبوة وجبة ألومنيوم حراري مقسمة',
    category: 'تغليف وتعبئة',
    unit: 'قطعة',
    currentStock: 250,
    minStockAlert: 50,
    unitCost: 450, // 4.50 EGP
    salePrice: 650,
    lastUpdated: getTodayDateString(),
  },
];

const DEFAULT_KITCHEN_STATIONS: KitchenStation[] = [
  {
    id: 'st-grill',
    code: 'KST-01',
    name: 'قسم المشويات والفحم',
    colorBadge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    iconType: 'grill',
    isActive: true,
  },
  {
    id: 'st-shawarma',
    code: 'KST-02',
    name: 'قسم الشاورما والتجهيز والساندوتشات',
    colorBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconType: 'sandwich',
    isActive: true,
  },
  {
    id: 'st-oven',
    code: 'KST-03',
    name: 'قسم الفرن والمخبوزات والبيتزا',
    colorBadge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    iconType: 'oven',
    isActive: true,
  },
  {
    id: 'st-cafe',
    code: 'KST-04',
    name: 'قسم الكافيه والمشروبات',
    colorBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconType: 'drink',
    isActive: true,
  },
  {
    id: 'st-salad',
    code: 'KST-05',
    name: 'قسم المقبلات والسلطات',
    colorBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconType: 'salad',
    isActive: true,
  },
];

const DEFAULT_DELIVERY_DRIVERS: DeliveryDriver[] = [
  {
    id: 'drv-1',
    code: 'DRV-01',
    name: 'محمود عاشور',
    phone: '01099881122',
    vehicleType: 'دراجة نارية',
    isActive: true,
    currentOrdersCount: 0,
    totalDeliveredCount: 18,
    cashInCustodyMinor: 0,
    notes: 'طيار المنطقة الأولى والمربعات السكنية القريبة',
  },
  {
    id: 'drv-2',
    code: 'DRV-02',
    name: 'إبراهيم فؤاد',
    phone: '01122339900',
    vehicleType: 'سكوتر',
    isActive: true,
    currentOrdersCount: 0,
    totalDeliveredCount: 12,
    cashInCustodyMinor: 0,
    notes: 'طيار الطلبات السريعة والشركات',
  },
];

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dish-1',
    code: 'MNU-101',
    name: 'وجبة كفتة مشوية على الفحم (نصف كيلو)',
    category: 'المشويات والوجبات',
    kitchenStationId: 'st-grill',
    sellingPrice: 28000, // 280 EGP
    theoreticalCost: 16500, // calculated from recipe
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-1', itemName: 'لحم بقري مفروم بلدي صافي', unit: 'كجم', qty: 0.4 },
      { inventoryItemId: 'inv-3', itemName: 'أرز بسمتي هندي ذهبي', unit: 'كجم', qty: 0.22 },
      { inventoryItemId: 'inv-6', itemName: 'عبوة وجبة ألومنيوم حراري مقسمة', unit: 'قطعة', qty: 1 },
    ],
  },
  {
    id: 'dish-2',
    code: 'MNU-102',
    name: 'وجبة شيش طاووق دجاج مع أرز بسمتي',
    category: 'المشويات والوجبات',
    kitchenStationId: 'st-grill',
    sellingPrice: 19500, // 195 EGP
    theoreticalCost: 9225,
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-2', itemName: 'صدور دجاج فيليه متبلة', unit: 'كجم', qty: 0.35 },
      { inventoryItemId: 'inv-3', itemName: 'أرز بسمتي هندي ذهبي', unit: 'كجم', qty: 0.25 },
      { inventoryItemId: 'inv-6', itemName: 'عبوة وجبة ألومنيوم حراري مقسمة', unit: 'قطعة', qty: 1 },
    ],
  },
  {
    id: 'dish-3',
    code: 'MNU-201',
    name: 'ساندوتش شاورما دجاج صاروخ صاج',
    category: 'الساندوتشات والشاورما',
    kitchenStationId: 'st-shawarma',
    sellingPrice: 9500, // 95 EGP
    theoreticalCost: 4160,
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-2', itemName: 'صدور دجاج فيليه متبلة', unit: 'كجم', qty: 0.18 },
      { inventoryItemId: 'inv-4', itemName: 'خبز صاج شاورما / تورتيلا كبير', unit: 'قطعة', qty: 1 },
      { inventoryItemId: 'inv-5', itemName: 'بطاطس نصف مقلية فارم', unit: 'كجم', qty: 0.05 },
    ],
  },
  {
    id: 'dish-4',
    code: 'MNU-202',
    name: 'ساندوتش كفتة بلدي مشوي بالطحينة',
    category: 'الساندوتشات والشاورما',
    kitchenStationId: 'st-shawarma',
    sellingPrice: 10500, // 105 EGP
    theoreticalCost: 5390,
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-1', itemName: 'لحم بقري مفروم بلدي صافي', unit: 'كجم', qty: 0.14 },
      { inventoryItemId: 'inv-4', itemName: 'خبز صاج شاورما / تورتيلا كبير', unit: 'قطعة', qty: 1 },
    ],
  },
  {
    id: 'dish-5',
    code: 'MNU-301',
    name: 'باكيت بطاطس كرانشي كبير بالجبنة',
    category: 'المقبلات والإضافات',
    kitchenStationId: 'st-salad',
    sellingPrice: 5500, // 55 EGP
    theoreticalCost: 2190,
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-5', itemName: 'بطاطس نصف مقلية فارم', unit: 'كجم', qty: 0.3 },
      { inventoryItemId: 'inv-6', itemName: 'عبوة وجبة ألومنيوم حراري مقسمة', unit: 'قطعة', qty: 1 },
    ],
  },
  {
    id: 'dish-6',
    code: 'MNU-302',
    name: 'طبق أرز بسمتي بالمكسرات والزبيب',
    category: 'المقبلات والإضافات',
    kitchenStationId: 'st-salad',
    sellingPrice: 6500, // 65 EGP
    theoreticalCost: 2325,
    active: true,
    ingredients: [
      { inventoryItemId: 'inv-3', itemName: 'أرز بسمتي هندي ذهبي', unit: 'كجم', qty: 0.25 },
      { inventoryItemId: 'inv-6', itemName: 'عبوة وجبة ألومنيوم حراري مقسمة', unit: 'قطعة', qty: 1 },
    ],
  },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'SUP-01',
    name: 'شركة المراعي لتوريد اللحوم والدواجن',
    phone: '01099887766',
    supplyCategory: 'لحوم ودواجن',
    creditBalance: 450000, // 4,500 EGP
    notes: 'توريد يومي صباحاً - تسوية أسبوعية يوم الخميس',
  },
  {
    id: 'sup-2',
    code: 'SUP-02',
    name: 'مؤسسة النور للمواد الغذائية والتغليف',
    phone: '01122334455',
    supplyCategory: 'بقوليات وتغليف',
    creditBalance: 185000, // 1,850 EGP
    notes: 'توريد أرز بسمتي وعبوات ألومنيوم',
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    code: 'CST-01',
    name: 'شركة النيل للهندسة والمقاولات (تعاقد وجبات)',
    phone: '01011122233',
    address: 'الحي السابع - مدينة نصر',
    allowCredit: true,
    creditLimit: 500000, // 5,000 EGP limit
    currentDebt: 125000, // 1,250 EGP current debt
    notes: 'عميل شركات معتمد للبيع الآجل وتحصيل شهري',
  },
  {
    id: 'cust-2',
    code: 'CST-02',
    name: 'أ. محمود عبد الرحمن (عميل VIP)',
    phone: '01233445566',
    address: 'مكرم عبيد - عمارة 14',
    allowCredit: true,
    creditLimit: 200000, // 2,000 EGP limit
    currentDebt: 45000, // 450 EGP
    notes: 'مسموح بالبيع الآجل حتى الحد الائتماني',
  },
  {
    id: 'cust-3',
    code: 'CST-03',
    name: 'أ. سارة فؤاد (عميل نقدي فقط)',
    phone: '01555667788',
    address: 'شارع الطيران',
    allowCredit: false,
    creditLimit: 0,
    currentDebt: 0,
    notes: 'عميل مسجل للتوصيل - غير مصرح له بالبيع الآجل',
  },
];

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    code: 'WELCOME15',
    title: 'خصم ترحيبي 15% للعملاء',
    description: 'خصم 15% على إجمالي قيمة الطلب للطلبات من 150 ج.م فما فوق (سقف 50 ج.م).',
    type: 'percentage',
    discountValue: 15,
    minOrderAmount: 15000, // 150 EGP
    maxDiscountCap: 5000, // 50 EGP
    isActive: true,
    usageCount: 14,
    badge: 'عرض ترحيبي',
  },
  {
    id: 'promo-2',
    code: 'WEEKEND20',
    title: 'عرض نهاية الأسبوع الذهبي (20%)',
    description: 'وفر 20% على طلبات العطلة الأسبوعية بقيمة 200 ج.م فأكثر (سقف 70 ج.م).',
    type: 'percentage',
    discountValue: 20,
    minOrderAmount: 20000, // 200 EGP
    maxDiscountCap: 7000, // 70 EGP
    isActive: true,
    usageCount: 28,
    badge: 'نهاية الأسبوع',
  },
  {
    id: 'promo-3',
    code: 'MEALDEAL35',
    title: 'قسيمة توفير فورية 35 ج.م',
    description: 'خصم نقدي مباشر قدره 35 ج.م عند الشراء بقيمة 180 ج.م فأكثر.',
    type: 'fixed_amount',
    discountValue: 3500, // 35 EGP
    minOrderAmount: 18000, // 180 EGP
    isActive: true,
    usageCount: 42,
    badge: 'توفير فوري',
  },
  {
    id: 'promo-4',
    code: 'BOGO-SHAW',
    title: 'عرض الشاورما (اشترِ 2 واحصل على الثالث مجاناً)',
    description: 'اشترِ 2 ساندوتش شاورما واحصل على الساندوتش الثالث بخصم 100% (مجاناً).',
    type: 'bogo',
    discountValue: 0,
    minOrderAmount: 0,
    applicableMenuItemId: 'dish-3',
    bogoBuyQty: 2,
    bogoGetQty: 1,
    bogoDiscountPercent: 100,
    isActive: true,
    usageCount: 9,
    badge: 'عرض BOGO',
  },
  {
    id: 'promo-5',
    code: 'FAMILY50',
    title: 'خصم وجبة العائلة 50 ج.م',
    description: 'خصم نقدي بقيمة 50 ج.م على الطلبات الكبيرة بقيمة 300 ج.م فأكثر.',
    type: 'fixed_amount',
    discountValue: 5000, // 50 EGP
    minOrderAmount: 30000, // 300 EGP
    isActive: true,
    usageCount: 19,
    badge: 'توفير العائلات',
  },
  {
    id: 'promo-6',
    code: 'SNACK10',
    title: 'خصم 10% سريع بدون حد أدنى',
    description: 'خصم مباشر 10% لجميع الوجبات بدون أي حد أدنى للطلب.',
    type: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountCap: 3000, // 30 EGP
    isActive: true,
    usageCount: 31,
    badge: 'سريع وسهل',
  },
];

const DEFAULT_SHIFTS: Shift[] = [
  {
    id: 'shift-active-1',
    shiftNumber: 104,
    cashierName: 'أحمد كمال',
    date: getTodayDateString(),
    openedAt: '09:00',
    status: 'open',
    openingCustody: 150000, // 1,500 EGP
    cashSales: 66500, // 665 EGP
    visaSales: 39000, // 390 EGP
    instapaySales: 28000, // 280 EGP
    ewalletSales: 0,
    creditSales: 29000, // 290 EGP
  },
];

const DEFAULT_SALE_ORDERS: SaleOrder[] = [
  {
    id: 'ord-1001',
    orderNumber: 'INV-104-001',
    shiftId: 'shift-active-1',
    date: getTodayDateString(),
    time: '11:20',
    cashierName: 'أحمد كمال',
    paymentMethod: 'cash',
    orderType: 'dine_in',
    tableNumber: 'طاولة 3',
    tableGuests: 2,
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    dailySequenceNumber: 1,
    kotPrinted: true,
    kotPrintTime: '11:21',
    lines: [
      {
        menuItemId: 'dish-1',
        code: 'MNU-101',
        menuItemName: 'وجبة كفتة مشوية على الفحم (نصف كيلو)',
        qty: 2,
        unitPrice: 28000,
        unitTheoreticalCost: 16500,
        totalPrice: 56000,
        totalTheoreticalCost: 33000,
        kitchenStationId: 'st-grill',
        kitchenStationName: 'قسم المشويات والفحم',
        notes: 'تسوية زيادة شوية مع سلاطة طحينة إضافية',
      },
      {
        menuItemId: 'dish-4',
        code: 'MNU-202',
        menuItemName: 'ساندوتش كفتة بلدي مشوي بالطحينة',
        qty: 1,
        unitPrice: 10500,
        unitTheoreticalCost: 5390,
        totalPrice: 10500,
        totalTheoreticalCost: 5390,
        kitchenStationId: 'st-shawarma',
        kitchenStationName: 'قسم الشاورما والتجهيز والساندوتشات',
      },
    ],
    subtotal: 66500,
    discount: 0,
    totalAmount: 66500,
    totalTheoreticalCost: 38390,
  },
  {
    id: 'ord-1002',
    orderNumber: 'INV-104-002',
    shiftId: 'shift-active-1',
    date: getTodayDateString(),
    time: '12:45',
    cashierName: 'أحمد كمال',
    paymentMethod: 'visa',
    paymentRef: 'AUTH-9942',
    orderType: 'takeaway',
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    dailySequenceNumber: 2,
    kotPrinted: true,
    kotPrintTime: '12:46',
    lines: [
      {
        menuItemId: 'dish-2',
        code: 'MNU-102',
        menuItemName: 'وجبة شيش طاووق دجاج مع أرز بسمتي',
        qty: 2,
        unitPrice: 19500,
        unitTheoreticalCost: 9225,
        totalPrice: 39000,
        totalTheoreticalCost: 18450,
        kitchenStationId: 'st-grill',
        kitchenStationName: 'قسم المشويات والفحم',
        notes: 'تغليف تيك أواي حار',
      },
    ],
    subtotal: 39000,
    discount: 0,
    totalAmount: 39000,
    totalTheoreticalCost: 18450,
  },
  {
    id: 'ord-1003',
    orderNumber: 'INV-104-003',
    shiftId: 'shift-active-1',
    date: getTodayDateString(),
    time: '13:30',
    cashierName: 'أحمد كمال',
    paymentMethod: 'instapay',
    paymentRef: 'IPN-78210',
    orderType: 'delivery',
    deliveryFee: 2000, // 20 EGP
    deliveryDriverId: 'drv-1',
    deliveryDriverName: 'محمود عاشور',
    deliveryAddress: 'عمارة 15 شارع النصر، الدور 3 شقة 5',
    deliveryPhone: '01055443322',
    customerName: 'المهندس ياسر',
    customerPhone: '01055443322',
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    dailySequenceNumber: 3,
    kotPrinted: true,
    kotPrintTime: '13:31',
    lines: [
      {
        menuItemId: 'dish-1',
        code: 'MNU-101',
        menuItemName: 'وجبة كفتة مشوية على الفحم (نصف كيلو)',
        qty: 1,
        unitPrice: 28000,
        unitTheoreticalCost: 16500,
        totalPrice: 28000,
        totalTheoreticalCost: 16500,
        kitchenStationId: 'st-grill',
        kitchenStationName: 'قسم المشويات والفحم',
      },
    ],
    subtotal: 28000,
    discount: 0,
    totalAmount: 28000,
    totalTheoreticalCost: 16500,
  },
  {
    id: 'ord-1004',
    orderNumber: 'INV-104-004',
    shiftId: 'shift-active-1',
    date: getTodayDateString(),
    time: '14:15',
    cashierName: 'أحمد كمال',
    paymentMethod: 'credit',
    customerId: 'cust-1',
    customerName: 'شركة النيل للهندسة والمقاولات (تعاقد وجبات)',
    customerBalanceAfter: 125000,
    orderType: 'delivery',
    deliveryFee: 0,
    deliveryDriverId: 'drv-2',
    deliveryDriverName: 'إبراهيم فؤاد',
    deliveryAddress: 'مقر الشركة - الحي السابع مدينة نصر',
    deliveryPhone: '01011122233',
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    dailySequenceNumber: 4,
    kotPrinted: true,
    kotPrintTime: '14:16',
    lines: [
      {
        menuItemId: 'dish-3',
        code: 'MNU-201',
        menuItemName: 'ساندوتش شاورما دجاج صاروخ صاج',
        qty: 3,
        unitPrice: 9500,
        unitTheoreticalCost: 4160,
        totalPrice: 28500,
        totalTheoreticalCost: 12480,
        kitchenStationId: 'st-shawarma',
        kitchenStationName: 'قسم الشاورما والتجهيز والساندوتشات',
        notes: 'بدون بصل وسلاطة زيادة',
      },
    ],
    subtotal: 29000,
    discount: 500,
    totalAmount: 28500,
    totalTheoreticalCost: 12480,
  },
];

const DEFAULT_VOUCHERS: Voucher[] = [
  {
    id: 'vch-1',
    voucherNumber: 'EXP-104-01',
    shiftId: 'shift-active-1',
    type: 'expense',
    date: getTodayDateString(),
    time: '10:15',
    amount: 18000, // 180 EGP
    accountCode: 'EXP-101',
    accountName: 'مشتريات خامات ومطبخ طازجة',
    recipient: 'مزارع الوادي للخضروات الطازجة',
    description: 'شراء طماطم وخس وبقدونس ولوازم السلاطة اليومية',
    cashierName: 'أحمد كمال',
  },
  {
    id: 'vch-2',
    voucherNumber: 'REC-104-01',
    shiftId: 'shift-active-1',
    type: 'customer_collection',
    date: getTodayDateString(),
    time: '12:10',
    amount: 30000, // 300 EGP
    accountCode: 'REC-202',
    accountName: 'تحصيل مديونية عملاء آجل',
    recipient: 'شركة النيل للهندسة والمقاولات (تعاقد وجبات)',
    description: 'تحصيل دفعة نقدية من حساب المديونية الآجلة',
    cashierName: 'أحمد كمال',
    customerId: 'cust-1',
  },
];

export class StorageService {
  // --- Settings ---
  static getSettings(): RestaurantSettings {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      if (!raw) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: RestaurantSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  static resetToOnboarding(): void {
    const s = this.getSettings();
    this.saveSettings({ ...s, isOnboarded: false });
  }

  // --- Multi-Tenant Business Registry & Switching ---
  static getBusinesses(): TenantBusiness[] {
    try {
      const raw = localStorage.getItem(KEYS.BUSINESSES);
      let list: TenantBusiness[] = raw ? JSON.parse(raw) : [];
      const currentSettings = this.getSettings();
      const currentBizId = currentSettings.businessId || 'biz-default';

      if (!list || list.length === 0) {
        const defaultBiz: TenantBusiness = {
          id: currentBizId,
          name: currentSettings.restaurantName || 'مطعم الشرق الأصيل',
          branchName: currentSettings.branchName || 'الفرع الرئيسي',
          businessType: currentSettings.businessType || 'restaurant',
          currency: currentSettings.currency || 'ج.م',
          phone: currentSettings.phone,
          address: currentSettings.address,
          createdAt: getTodayDateString(),
          lastOpenedAt: new Date().toISOString(),
        };
        list = [defaultBiz];
        localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(list));
      } else {
        // Sync current settings to list item if matched
        const idx = list.findIndex((b) => b.id === currentBizId);
        if (idx !== -1) {
          list[idx].name = currentSettings.restaurantName;
          list[idx].branchName = currentSettings.branchName;
          list[idx].businessType = currentSettings.businessType;
          list[idx].currency = currentSettings.currency;
          list[idx].phone = currentSettings.phone;
          list[idx].address = currentSettings.address;
        } else {
          list.push({
            id: currentBizId,
            name: currentSettings.restaurantName,
            branchName: currentSettings.branchName,
            businessType: currentSettings.businessType,
            currency: currentSettings.currency,
            phone: currentSettings.phone,
            address: currentSettings.address,
            createdAt: getTodayDateString(),
            lastOpenedAt: new Date().toISOString(),
          });
        }
        localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(list));
      }
      return list;
    } catch {
      return [];
    }
  }

  static getActiveBusinessId(): string {
    const s = this.getSettings();
    return s.businessId || localStorage.getItem(KEYS.ACTIVE_BUSINESS_ID) || 'biz-default';
  }

  static getActiveBusiness(): TenantBusiness {
    const businesses = this.getBusinesses();
    const activeId = this.getActiveBusinessId();
    return businesses.find((b) => b.id === activeId) || businesses[0];
  }

  static createBusinessBundle(): BusinessBackupBundle {
    const s = this.getSettings();
    const b = this.getActiveBusiness();
    return {
      version: '2.0',
      exportDate: new Date().toISOString(),
      business: b,
      settings: s,
      categories: this.getCategories(),
      inventory: this.getInventory(),
      menuItems: this.getMenuItems(),
      suppliers: this.getSuppliers(),
      customers: this.getCustomers(),
      shifts: this.getShifts(),
      vouchers: this.getVouchers(),
      saleOrders: this.getSaleOrders(),
      promotions: this.getPromotions(),
      users: this.getUsers(),
      partners: this.getPartners(),
      employees: this.getEmployees(),
      kitchenStations: this.getKitchenStations(),
      deliveryDrivers: this.getDeliveryDrivers(),
    };
  }

  static saveBusinessSnapshot(bizId: string): void {
    const bundle = this.createBusinessBundle();
    localStorage.setItem(`fastrest_biz_bundle_${bizId}`, JSON.stringify(bundle));
  }

  static loadBusinessSnapshot(bundle: BusinessBackupBundle): void {
    if (!bundle || !bundle.settings) return;
    this.saveSettings(bundle.settings);
    if (bundle.categories) this.saveCategories(bundle.categories);
    if (bundle.inventory) this.saveInventory(bundle.inventory);
    if (bundle.menuItems) this.saveMenuItems(bundle.menuItems);
    if (bundle.suppliers) this.saveSuppliers(bundle.suppliers);
    if (bundle.customers) this.saveCustomers(bundle.customers);
    if (bundle.shifts) this.saveShifts(bundle.shifts);
    if (bundle.vouchers) this.saveVouchers(bundle.vouchers);
    if (bundle.saleOrders) this.saveSaleOrders(bundle.saleOrders);
    if (bundle.promotions) this.savePromotions(bundle.promotions);
    if (bundle.users) this.saveUsers(bundle.users);
    if (bundle.partners) this.savePartners(bundle.partners);
    if (bundle.employees) this.saveEmployees(bundle.employees);
    if (bundle.kitchenStations) this.saveKitchenStations(bundle.kitchenStations);
    if (bundle.deliveryDrivers) this.saveDeliveryDrivers(bundle.deliveryDrivers);

    localStorage.setItem(KEYS.ACTIVE_BUSINESS_ID, bundle.business.id);
  }

  static switchBusiness(targetBizId: string): boolean {
    const currentBizId = this.getActiveBusinessId();
    if (currentBizId === targetBizId) return true;

    // 1. Snapshot current business
    this.saveBusinessSnapshot(currentBizId);

    // 2. Load target snapshot if exists
    const raw = localStorage.getItem(`fastrest_biz_bundle_${targetBizId}`);
    if (raw) {
      const bundle: BusinessBackupBundle = JSON.parse(raw);
      this.loadBusinessSnapshot(bundle);
    } else {
      // Find business meta
      const businesses = this.getBusinesses();
      const targetMeta = businesses.find((b) => b.id === targetBizId);
      if (targetMeta) {
        const newSettings: RestaurantSettings = {
          ...DEFAULT_SETTINGS,
          businessId: targetMeta.id,
          restaurantName: targetMeta.name,
          branchName: targetMeta.branchName,
          businessType: targetMeta.businessType,
          currency: targetMeta.currency,
          phone: targetMeta.phone || '',
          address: targetMeta.address || '',
          isOnboarded: true,
        };
        this.saveSettings(newSettings);
        localStorage.setItem(KEYS.ACTIVE_BUSINESS_ID, targetMeta.id);
      }
    }

    // Update lastOpenedAt in business list
    const list = this.getBusinesses();
    const updated = list.map((b) =>
      b.id === targetBizId ? { ...b, lastOpenedAt: new Date().toISOString() } : b
    );
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(updated));
    return true;
  }

  static createNewBusiness(params: {
    name: string;
    branchName: string;
    businessType: 'restaurant' | 'retail';
    currency: string;
    phone?: string;
    address?: string;
    initialCapitalMinor?: number;
    ownerName?: string;
    ownerPhone?: string;
  }): TenantBusiness {
    // 1. Snapshot current active business
    const currentBizId = this.getActiveBusinessId();
    this.saveBusinessSnapshot(currentBizId);

    // 2. Generate new business ID
    const newBizId = `biz-${Date.now()}`;
    const newBiz: TenantBusiness = {
      id: newBizId,
      name: params.name.trim(),
      branchName: params.branchName.trim() || 'الفرع الرئيسي',
      businessType: params.businessType,
      currency: params.currency.trim() || 'ج.م',
      phone: params.phone?.trim() || '',
      address: params.address?.trim() || '',
      createdAt: getTodayDateString(),
      lastOpenedAt: new Date().toISOString(),
    };

    // 3. Register in list
    const list = this.getBusinesses();
    const updatedList = [newBiz, ...list];
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(updatedList));
    localStorage.setItem(KEYS.ACTIVE_BUSINESS_ID, newBizId);

    // 4. Create fresh settings
    const newSettings: RestaurantSettings = {
      ...DEFAULT_SETTINGS,
      businessId: newBizId,
      restaurantName: newBiz.name,
      branchName: newBiz.branchName,
      businessType: newBiz.businessType,
      currency: newBiz.currency,
      phone: newBiz.phone || '',
      address: newBiz.address || '',
      isOnboarded: true,
    };
    this.saveSettings(newSettings);

    // 5. Initialize fresh business datasets
    const initialCategories: AccountCategory[] = [
      { id: `cat-exp-1`, code: 'EXP-101', name: 'مشتريات خامات ومطبخ طازجة', type: 'expense', linkedPartyType: 'general' },
      { id: `cat-exp-2`, code: 'EXP-102', name: 'أجور ومرتبات وسلف العاملين', type: 'expense', linkedPartyType: 'employee' },
      { id: `cat-exp-3`, code: 'EXP-103', name: 'فواتير مرافق وكهرباء وتشغيل', type: 'expense', linkedPartyType: 'general' },
      { id: `cat-exp-4`, code: 'EXP-104', name: 'سداد دفعات موردين آجل', type: 'expense', linkedPartyType: 'supplier' },
      { id: `cat-exp-5`, code: 'EXP-105', name: 'مسحوبات جاري الشركاء والملاك', type: 'expense', linkedPartyType: 'partner' },
      { id: `cat-rec-1`, code: 'REC-201', name: 'إيرادات مبيعات نقدية وخارجية', type: 'receipt', linkedPartyType: 'general' },
      { id: `cat-rec-2`, code: 'REC-202', name: 'تحصيل مديونية عملاء آجل', type: 'receipt', linkedPartyType: 'customer' },
      { id: `cat-rec-3`, code: 'REC-203', name: 'إيداع وتمويل جاري الشركاء', type: 'receipt', linkedPartyType: 'partner' },
    ];
    this.saveCategories(initialCategories);

    const initialUsers: AppUser[] = [
      {
        id: `usr-cashier-${Date.now()}`,
        code: 'USR-01',
        name: 'كاشير الوردية',
        role: 'cashier',
        pin: '1111',
        phone: '',
        isActive: true,
        maxExpenseLimitMinor: 20000,
        notes: 'حساب الكاشير الافتراضي',
      },
      {
        id: `usr-owner-${Date.now()}`,
        code: 'USR-02',
        name: params.ownerName?.trim() || 'المالك / المدير العام',
        role: 'partner',
        pin: '1234',
        phone: params.ownerPhone?.trim() || '',
        isActive: true,
        maxExpenseLimitMinor: 0,
        notes: 'المالك المؤسس - صلاحيات كاملة',
      },
    ];
    this.saveUsers(initialUsers);
    this.setActiveUser(initialUsers[1].id);

    // Initial partner if owner provided
    if (params.ownerName) {
      const initialPartner: Partner = {
        id: `prt-${Date.now()}`,
        code: 'PRT-01',
        name: params.ownerName.trim(),
        phone: params.ownerPhone?.trim() || '',
        roleTitle: 'شريك مؤسس ومدير',
        equityPercent: 100,
        capitalAmount: params.initialCapitalMinor || 10000000,
        monthlyManagementSalary: 0,
        totalDeposits: 0,
        totalDrawings: 0,
        currentBalance: 0,
        isActive: true,
      };
      this.savePartners([initialPartner]);
    } else {
      this.savePartners([]);
    }

    // Clear operational lists for the fresh business
    this.saveInventory([]);
    this.saveMenuItems([]);
    this.saveSuppliers([]);
    this.saveCustomers([]);
    this.saveShifts([]);
    this.saveVouchers([]);
    this.saveSaleOrders([]);
    this.savePromotions([]);
    this.saveEmployees([]);
    this.saveKitchenStations(DEFAULT_KITCHEN_STATIONS);
    this.saveDeliveryDrivers([]);

    // Save snapshot of this freshly initialized business
    this.saveBusinessSnapshot(newBizId);

    return newBiz;
  }

  static deleteBusiness(bizId: string): boolean {
    const list = this.getBusinesses();
    if (list.length <= 1) {
      return false; // cannot delete the only business
    }
    const filtered = list.filter((b) => b.id !== bizId);
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(filtered));
    localStorage.removeItem(`fastrest_biz_bundle_${bizId}`);

    // If deleted the active one, switch to first remaining
    if (this.getActiveBusinessId() === bizId) {
      this.switchBusiness(filtered[0].id);
    }
    return true;
  }

  static exportBusinessBackupFile(bizId?: string): void {
    const targetId = bizId || this.getActiveBusinessId();
    // Ensure active is snapshotted
    if (targetId === this.getActiveBusinessId()) {
      this.saveBusinessSnapshot(targetId);
    }
    const raw = localStorage.getItem(`fastrest_biz_bundle_${targetId}`);
    let bundle: BusinessBackupBundle;
    if (raw) {
      bundle = JSON.parse(raw);
    } else {
      bundle = this.createBusinessBundle();
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const cleanName = (bundle.business.name || 'business').replace(/[\s/\\?%*:|"<>]/g, '_');
    downloadAnchor.setAttribute('download', `FastRest_Backup_${cleanName}_${getTodayDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  static importBusinessBackupFile(jsonContent: string): TenantBusiness {
    const bundle: BusinessBackupBundle = JSON.parse(jsonContent);
    if (!bundle.business || !bundle.settings) {
      throw new Error('الملف غير صالح أو لا يحتوي على بنية بيانات المطعم الصحيحة');
    }

    // Generate a unique ID to avoid collision if importing into same device
    const newBizId = `biz-${Date.now()}`;
    bundle.business.id = newBizId;
    bundle.settings.businessId = newBizId;

    // Add to businesses list
    const list = this.getBusinesses();
    const updatedList = [bundle.business, ...list];
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(updatedList));

    // Save snapshot bundle
    localStorage.setItem(`fastrest_biz_bundle_${newBizId}`, JSON.stringify(bundle));

    // Switch to it immediately
    this.loadBusinessSnapshot(bundle);
    return bundle.business;
  }

  // --- Developer Mock Data & Wiping Operations ---
  static loadMockDemoData(type: 'restaurant' | 'retail' = 'restaurant'): void {
    const activeBizId = this.getActiveBusinessId();
    const currentSettings = this.getSettings();

    const mockSettings: RestaurantSettings = {
      ...DEFAULT_SETTINGS,
      businessId: activeBizId,
      restaurantName:
        type === 'retail' ? 'سوبر ماركت وميني ماركت البركة' : 'مطعم ومشويات الشرق الأصيل',
      branchName: currentSettings.branchName || 'الفرع الرئيسي',
      businessType: type,
      isOnboarded: true,
      currency: currentSettings.currency || 'ج.م',
      phone: currentSettings.phone || '01001234567',
      address: currentSettings.address || 'شارع عباس العقاد، مدينة نصر، القاهرة',
      taxNumber: '412-889-105',
      footerNote: 'جميع الأسعار شاملة الضريبة · نتمنى لكم وجبة شهية',
      adminPin: currentSettings.adminPin || '1234',
      defaultPrintFormat: 'thermal',
      enforceBlindCloseForCashier: true,
      defaultCashierExpenseLimitMinor: 20000,
    };

    this.saveSettings(mockSettings);
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveInventory(DEFAULT_INVENTORY);
    this.saveMenuItems(DEFAULT_MENU_ITEMS);
    this.saveSuppliers(DEFAULT_SUPPLIERS);
    this.saveCustomers(DEFAULT_CUSTOMERS);
    this.savePromotions(DEFAULT_PROMOTIONS);
    this.saveShifts(DEFAULT_SHIFTS);
    this.saveSaleOrders(DEFAULT_SALE_ORDERS);
    this.saveVouchers(DEFAULT_VOUCHERS);
    this.saveUsers(DEFAULT_USERS);
    this.setActiveUser(DEFAULT_USERS[0].id);
    this.savePartners(DEFAULT_PARTNERS);
    this.saveEmployees(DEFAULT_EMPLOYEES);
    this.saveKitchenStations(DEFAULT_KITCHEN_STATIONS);
    this.saveDeliveryDrivers(DEFAULT_DELIVERY_DRIVERS);

    // Sync business list meta
    const list = this.getBusinesses();
    const updated = list.map((b) =>
      b.id === activeBizId
        ? {
            ...b,
            name: mockSettings.restaurantName,
            branchName: mockSettings.branchName,
            businessType: mockSettings.businessType,
          }
        : b
    );
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(updated));

    // Snapshot
    this.saveBusinessSnapshot(activeBizId);
  }

  static wipeCurrentBusinessData(mode: 'operational_only' | 'complete_reset' = 'operational_only'): void {
    const activeBizId = this.getActiveBusinessId();

    // 1. Always wipe operational transactions
    this.saveShifts([]);
    this.saveSaleOrders([]);
    this.saveVouchers([]);
    localStorage.removeItem(KEYS.WASTE);

    // Reset driver custody
    const drivers = this.getDeliveryDrivers();
    this.saveDeliveryDrivers(
      drivers.map((d) => ({ ...d, currentOrdersCount: 0, cashInCustodyMinor: 0 }))
    );

    // Reset partner drawing/deposits balances to 0
    const partners = this.getPartners();
    const resetPartners = partners.map((p) => ({
      ...p,
      totalDeposits: 0,
      totalDrawings: 0,
      currentBalance: 0,
    }));
    this.savePartners(resetPartners);

    // Reset employee advances and custodies to 0
    const employees = this.getEmployees();
    const resetEmployees = employees.map((e) => ({
      ...e,
      currentAdvances: 0,
      custodyBalance: 0,
    }));
    this.saveEmployees(resetEmployees);

    if (mode === 'complete_reset') {
      // Complete factory reset: wipe catalog, stock, partners, employees, customers, suppliers
      this.saveInventory([]);
      this.saveMenuItems([]);
      this.saveSuppliers([]);
      this.saveCustomers([]);
      this.savePromotions([]);
      this.savePartners([]);
      this.saveEmployees([]);
      this.saveKitchenStations(DEFAULT_KITCHEN_STATIONS);
      this.saveDeliveryDrivers([]);
    } else {
      // In operational_only mode: keep inventory and menu, but reset customer debts and supplier balances to 0
      const customers = this.getCustomers();
      this.saveCustomers(customers.map((c) => ({ ...c, currentDebt: 0 })));
      const suppliers = this.getSuppliers();
      this.saveSuppliers(suppliers.map((s) => ({ ...s, creditBalance: 0 })));
    }

    // Snapshot
    this.saveBusinessSnapshot(activeBizId);
  }

  static verifyAdminPin(pin: string): boolean {
    const clean = pin.trim();
    const s = this.getSettings();
    const expected = s.adminPin || '1234';
    if (clean === expected) return true;
    // Also allow any active Partner or Manager or Accountant PIN for Admin Vault access
    const users = this.getUsers();
    return users.some(
      (u) =>
        u.isActive &&
        (u.role === 'partner' || u.role === 'manager' || u.role === 'accountant') &&
        u.pin === clean
    );
  }

  static verifyApproverPin(pin: string): AppUser | null {
    const clean = pin.trim();
    const users = this.getUsers();
    const matched = users.find(
      (u) =>
        u.isActive &&
        (u.role === 'partner' || u.role === 'manager') &&
        u.pin === clean
    );
    if (matched) return matched;
    const s = this.getSettings();
    if (clean === (s.adminPin || '1234')) {
      return (
        users.find((u) => u.role === 'partner') || {
          id: 'usr-admin',
          code: 'ADM',
          name: 'المدير العام / الشريك',
          role: 'partner',
          pin: clean,
          isActive: true,
        }
      );
    }
    return null;
  }

  static updateAdminPin(newPin: string): void {
    const s = this.getSettings();
    this.saveSettings({ ...s, adminPin: newPin.trim() });
  }

  // --- Users & Roles (RBAC) ---
  static getUsers(): AppUser[] {
    try {
      const raw = localStorage.getItem(KEYS.USERS);
      if (!raw) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_USERS;
    }
  }

  static saveUsers(users: AppUser[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  static getActiveUser(): AppUser {
    const users = this.getUsers();
    const activeId = localStorage.getItem(KEYS.ACTIVE_USER_ID);
    if (activeId) {
      const found = users.find((u) => u.id === activeId && u.isActive);
      if (found) return found;
    }
    return users[0] || DEFAULT_USERS[0];
  }

  static setActiveUser(userId: string): AppUser {
    localStorage.setItem(KEYS.ACTIVE_USER_ID, userId);
    return this.getActiveUser();
  }

  static authenticateUser(userId: string, pin: string): AppUser | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId && u.isActive);
    if (!user) return null;
    if (user.pin === pin.trim()) {
      this.setActiveUser(user.id);
      return user;
    }
    return null;
  }

  // --- Partners (Owners Equity & Current Accounts) ---
  static getPartners(): Partner[] {
    try {
      const raw = localStorage.getItem(KEYS.PARTNERS);
      if (!raw) {
        localStorage.setItem(KEYS.PARTNERS, JSON.stringify(DEFAULT_PARTNERS));
        return DEFAULT_PARTNERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PARTNERS;
    }
  }

  static savePartners(partners: Partner[]): void {
    localStorage.setItem(KEYS.PARTNERS, JSON.stringify(partners));
  }

  // --- Employees & Workers (Staff Advances & Custody) ---
  static getEmployees(): Employee[] {
    try {
      const raw = localStorage.getItem(KEYS.EMPLOYEES);
      if (!raw) {
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
        return DEFAULT_EMPLOYEES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_EMPLOYEES;
    }
  }

  static saveEmployees(employees: Employee[]): void {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  }

  // --- Kitchen Stations ---
  static getKitchenStations(): KitchenStation[] {
    try {
      const raw = localStorage.getItem(KEYS.KITCHEN_STATIONS);
      if (!raw) {
        localStorage.setItem(KEYS.KITCHEN_STATIONS, JSON.stringify(DEFAULT_KITCHEN_STATIONS));
        return DEFAULT_KITCHEN_STATIONS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_KITCHEN_STATIONS;
    }
  }

  static saveKitchenStations(stations: KitchenStation[]): void {
    localStorage.setItem(KEYS.KITCHEN_STATIONS, JSON.stringify(stations));
  }

  static toggleKitchenStation(id: string): void {
    const list = this.getKitchenStations();
    const updated = list.map((st) => (st.id === id ? { ...st, isActive: !st.isActive } : st));
    this.saveKitchenStations(updated);
  }

  // --- Delivery Drivers (طيارين الدليفري) ---
  static getDeliveryDrivers(): DeliveryDriver[] {
    try {
      const raw = localStorage.getItem(KEYS.DELIVERY_DRIVERS);
      if (!raw) {
        localStorage.setItem(KEYS.DELIVERY_DRIVERS, JSON.stringify(DEFAULT_DELIVERY_DRIVERS));
        return DEFAULT_DELIVERY_DRIVERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_DELIVERY_DRIVERS;
    }
  }

  static saveDeliveryDrivers(drivers: DeliveryDriver[]): void {
    localStorage.setItem(KEYS.DELIVERY_DRIVERS, JSON.stringify(drivers));
  }

  static addDeliveryDriver(driverData: {
    name: string;
    phone: string;
    vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'on_foot';
    notes?: string;
  }): DeliveryDriver {
    const list = this.getDeliveryDrivers();
    const newDriver: DeliveryDriver = {
      id: `drv-${Date.now()}`,
      code: `DRV-${String(list.length + 1).padStart(2, '0')}`,
      name: driverData.name.trim(),
      phone: driverData.phone.trim(),
      vehicleType: driverData.vehicleType || 'motorcycle',
      isActive: true,
      currentOrdersCount: 0,
      totalDeliveredCount: 0,
      cashInCustodyMinor: 0,
      notes: driverData.notes?.trim() || undefined,
    };
    this.saveDeliveryDrivers([...list, newDriver]);
    return newDriver;
  }

  static updateDeliveryDriver(driver: DeliveryDriver): void {
    const list = this.getDeliveryDrivers();
    this.saveDeliveryDrivers(list.map((d) => (d.id === driver.id ? driver : d)));
  }

  static settleDriverCash(params: {
    driverId: string;
    settledAmountMinor: number;
    shiftId: string;
    cashierName: string;
    notes?: string;
  }): Voucher {
    const drivers = this.getDeliveryDrivers();
    const driver = drivers.find((d) => d.id === params.driverId);
    if (!driver) throw new Error('الطيار غير مسجل');

    const amount = Math.min(driver.cashInCustodyMinor, params.settledAmountMinor);
    if (amount <= 0) throw new Error('لا توجد عهدة نقدية للتوريد');

    const nextCustody = Math.max(0, driver.cashInCustodyMinor - amount);
    this.saveDeliveryDrivers(
      drivers.map((d) => (d.id === driver.id ? { ...d, cashInCustodyMinor: nextCustody } : d))
    );

    return this.addVoucher({
      shiftId: params.shiftId,
      cashierName: params.cashierName,
      type: 'receipt',
      accountCode: 'REC-301',
      amount,
      recipient: `الطيار: ${driver.name}`,
      description: `توريد نقدية تحصيل أوردرات دليفري من الطيار ${driver.name}${params.notes ? ` - ${params.notes}` : ''}`,
      accountName: 'خزينة الوردية / عهدة طيارين',
      financialContainer: 'shift_drawer',
    });
  }

  // --- Categories ---
  static getCategories(): AccountCategory[] {
    try {
      const raw = localStorage.getItem(KEYS.CATEGORIES);
      if (!raw) {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  static saveCategories(categories: AccountCategory[]): void {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  }

  // --- Inventory & Recipe Theoretical Cost ---
  static getInventory(): InventoryItem[] {
    try {
      const raw = localStorage.getItem(KEYS.INVENTORY);
      if (!raw) {
        localStorage.setItem(KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
        return DEFAULT_INVENTORY;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_INVENTORY;
    }
  }

  static saveInventory(items: InventoryItem[]): void {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    this.recalculateAllMenuCosts(items);
  }

  static recalculateAllMenuCosts(inventoryList?: InventoryItem[]): void {
    const inv = inventoryList || this.getInventory();
    const invMap = new Map<string, InventoryItem>(inv.map((i) => [i.id, i]));
    const rawMenu = localStorage.getItem(KEYS.MENU_ITEMS);
    if (!rawMenu) return;
    try {
      const menu: MenuItem[] = JSON.parse(rawMenu);
      const updated = menu.map((dish) => {
        if (!dish.ingredients || dish.ingredients.length === 0) return dish;
        const cost = Math.round(
          dish.ingredients.reduce((sum, ing) => {
            const matched = invMap.get(ing.inventoryItemId);
            const unitCost = matched ? matched.unitCost : ing.unitCostSnapshot || 0;
            return sum + unitCost * ing.qty;
          }, 0)
        );
        return {
          ...dish,
          theoreticalCost: cost,
        };
      });
      localStorage.setItem(KEYS.MENU_ITEMS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // --- Waste Logs ---
  static getWasteLogs(): WasteLog[] {
    try {
      const raw = localStorage.getItem(KEYS.WASTE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static recordWaste(itemId: string, qty: number, reason: string, recordedBy = 'الأدمن'): void {
    const inv = this.getInventory();
    const idx = inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = inv[idx];
    inv[idx] = {
      ...item,
      currentStock: Math.max(0, Number((item.currentStock - qty).toFixed(3))),
      lastUpdated: getTodayDateString(),
    };
    this.saveInventory(inv);

    const logs = this.getWasteLogs();
    const newLog: WasteLog = {
      id: `wst-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      qty,
      unitCost: item.unitCost,
      totalLoss: Math.round(item.unitCost * qty),
      reason,
      date: getTodayDateString(),
      recordedBy,
    };
    localStorage.setItem(KEYS.WASTE, JSON.stringify([newLog, ...logs]));
  }

  // --- Menu Items & Recipes ---
  static getMenuItems(): MenuItem[] {
    try {
      const raw = localStorage.getItem(KEYS.MENU_ITEMS);
      if (!raw) {
        localStorage.setItem(KEYS.MENU_ITEMS, JSON.stringify(DEFAULT_MENU_ITEMS));
        this.recalculateAllMenuCosts();
        const refreshed = localStorage.getItem(KEYS.MENU_ITEMS);
        return refreshed ? JSON.parse(refreshed) : DEFAULT_MENU_ITEMS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MENU_ITEMS;
    }
  }

  static saveMenuItems(items: MenuItem[]): void {
    localStorage.setItem(KEYS.MENU_ITEMS, JSON.stringify(items));
    this.recalculateAllMenuCosts();
  }

  // --- Suppliers ---
  static getSuppliers(): Supplier[] {
    try {
      const raw = localStorage.getItem(KEYS.SUPPLIERS);
      if (!raw) {
        localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
        return DEFAULT_SUPPLIERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SUPPLIERS;
    }
  }

  static saveSuppliers(suppliers: Supplier[]): void {
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }

  // --- Customers ---
  static getCustomers(): Customer[] {
    try {
      const raw = localStorage.getItem(KEYS.CUSTOMERS);
      if (!raw) {
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
        return DEFAULT_CUSTOMERS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  }

  static saveCustomers(customers: Customer[]): void {
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  static addCustomer(customerData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
    allowCredit?: boolean;
    creditLimit?: number;
  }): Customer {
    const list = this.getCustomers();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      code: `CST-${String(list.length + 1).padStart(2, '0')}`,
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      address: customerData.address?.trim() || undefined,
      notes: customerData.notes?.trim() || undefined,
      allowCredit: customerData.allowCredit ?? false,
      creditLimit: customerData.creditLimit ?? 0,
      currentDebt: 0,
    };
    this.saveCustomers([newCustomer, ...list]);
    return newCustomer;
  }

  // --- Marketing Promotions & Coupons Engine ---
  static getPromotions(): Promotion[] {
    try {
      const raw = localStorage.getItem(KEYS.PROMOTIONS);
      if (!raw) {
        localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(DEFAULT_PROMOTIONS));
        return DEFAULT_PROMOTIONS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PROMOTIONS;
    }
  }

  static savePromotions(promotions: Promotion[]): void {
    localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(promotions));
  }

  static addPromotion(promoData: Omit<Promotion, 'id' | 'usageCount'>): Promotion {
    const all = this.getPromotions();
    const newPromo: Promotion = {
      ...promoData,
      id: `promo-${Date.now()}`,
      usageCount: 0,
    };
    this.savePromotions([newPromo, ...all]);
    return newPromo;
  }

  static togglePromotionActive(id: string): void {
    const all = this.getPromotions();
    const updated = all.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    this.savePromotions(updated);
  }

  static deletePromotion(id: string): void {
    const all = this.getPromotions();
    this.savePromotions(all.filter((p) => p.id !== id));
  }

  static incrementPromotionUsage(code: string): void {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const all = this.getPromotions();
    const updated = all.map((p) =>
      p.code.trim().toUpperCase() === clean ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
    );
    this.savePromotions(updated);
  }

  // --- Shifts ---
  static getShifts(): Shift[] {
    try {
      const raw = localStorage.getItem(KEYS.SHIFTS);
      if (!raw) {
        localStorage.setItem(KEYS.SHIFTS, JSON.stringify(DEFAULT_SHIFTS));
        return DEFAULT_SHIFTS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SHIFTS;
    }
  }

  static saveShifts(shifts: Shift[]): void {
    localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  }

  static getActiveShift(): Shift | null {
    const shifts = this.getShifts();
    return shifts.find((s) => s.status === 'open') || null;
  }

  static openShift(cashierName: string, openingCustodyMinor: number): Shift {
    const shifts = this.getShifts();
    const maxNum = shifts.reduce((max, s) => Math.max(max, s.shiftNumber), 100);
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber: maxNum + 1,
      cashierName,
      date: getTodayDateString(),
      openedAt: getCurrentTimeString(),
      status: 'open',
      openingCustody: openingCustodyMinor,
      cashSales: 0,
      visaSales: 0,
      instapaySales: 0,
      ewalletSales: 0,
      creditSales: 0,
    };
    this.saveShifts([newShift, ...shifts]);
    return newShift;
  }

  static updateShiftSales(
    shiftId: string,
    cashSalesMinor: number,
    visaSalesMinor: number,
    instapaySalesMinor?: number,
    ewalletSalesMinor?: number
  ): void {
    const shifts = this.getShifts();
    const updated = shifts.map((s) => {
      if (s.id !== shiftId) return s;
      return {
        ...s,
        cashSales: cashSalesMinor,
        visaSales: visaSalesMinor,
        instapaySales: instapaySalesMinor ?? s.instapaySales ?? 0,
        ewalletSales: ewalletSalesMinor ?? s.ewalletSales ?? 0,
      };
    });
    this.saveShifts(updated);
  }

  static closeShift(
    shiftId: string,
    actualCountedCashMinor: number,
    closingNotes: string
  ): Shift | null {
    const shifts = this.getShifts();
    const target = shifts.find((s) => s.id === shiftId);
    if (!target) return null;
    const calc = this.calculateShiftCash(target);
    const variance = actualCountedCashMinor - calc.expectedCashInDrawer;
    const closedShift: Shift = {
      ...target,
      status: 'closed',
      closedAt: getCurrentTimeString(),
      actualCountedCash: actualCountedCashMinor,
      variance,
      closingNotes,
    };
    this.saveShifts(shifts.map((s) => (s.id === shiftId ? closedShift : s)));
    return closedShift;
  }

  // --- Vouchers ---
  static getVouchers(shiftId?: string): Voucher[] {
    try {
      const raw = localStorage.getItem(KEYS.VOUCHERS);
      const list: Voucher[] = raw ? JSON.parse(raw) : DEFAULT_VOUCHERS;
      if (!raw) {
        localStorage.setItem(KEYS.VOUCHERS, JSON.stringify(DEFAULT_VOUCHERS));
      }
      if (shiftId) {
        return list.filter((v) => v.shiftId === shiftId);
      }
      return list;
    } catch {
      return DEFAULT_VOUCHERS;
    }
  }

  static saveVouchers(vouchers: Voucher[]): void {
    localStorage.setItem(KEYS.VOUCHERS, JSON.stringify(vouchers));
  }

  static addVoucher(
    payload: Omit<Voucher, 'id' | 'voucherNumber' | 'date' | 'time'>
  ): Voucher {
    const all = this.getVouchers();
    const prefix =
      payload.type === 'expense'
        ? 'EXP'
        : payload.type === 'supplier_payment'
        ? 'SUP'
        : payload.type === 'credit_purchase'
        ? 'CRD'
        : payload.type === 'customer_collection'
        ? 'COL'
        : payload.type === 'partner_drawing'
        ? 'PDR'
        : payload.type === 'partner_deposit'
        ? 'PDP'
        : payload.type === 'staff_advance'
        ? 'ADV'
        : payload.type === 'staff_custody_settlement'
        ? 'CST'
        : 'REC';

    const voucherNumber = `${prefix}-${String(all.length + 1).padStart(4, '0')}`;
    let partyBalanceAfter: number | undefined;

    // 1. Update Supplier balance if supplier_payment or credit_purchase
    if (payload.supplierId) {
      const suppliers = this.getSuppliers();
      const updatedSuppliers = suppliers.map((sup) => {
        if (sup.id !== payload.supplierId) return sup;
        if (payload.type === 'credit_purchase') {
          const nextBal = sup.creditBalance + payload.amount;
          partyBalanceAfter = nextBal;
          return { ...sup, creditBalance: nextBal };
        }
        if (payload.type === 'supplier_payment') {
          const nextBal = Math.max(0, sup.creditBalance - payload.amount);
          partyBalanceAfter = nextBal;
          return { ...sup, creditBalance: nextBal };
        }
        return sup;
      });
      this.saveSuppliers(updatedSuppliers);
    }

    // 2. Update Customer debt if customer_collection
    if (payload.customerId && payload.type === 'customer_collection') {
      const customers = this.getCustomers();
      const updatedCustomers = customers.map((cust) => {
        if (cust.id !== payload.customerId) return cust;
        const nextDebt = Math.max(0, cust.currentDebt - payload.amount);
        partyBalanceAfter = nextDebt;
        return {
          ...cust,
          currentDebt: nextDebt,
        };
      });
      this.saveCustomers(updatedCustomers);
    }

    // 3. Update Partner current account if partner_drawing or partner_deposit
    if (payload.partnerId) {
      const partners = this.getPartners();
      const updatedPartners = partners.map((prt) => {
        if (prt.id !== payload.partnerId) return prt;
        if (payload.type === 'partner_drawing') {
          const nextDrawings = prt.totalDrawings + payload.amount;
          const nextBal = prt.currentBalance - payload.amount;
          partyBalanceAfter = nextBal;
          return {
            ...prt,
            totalDrawings: nextDrawings,
            currentBalance: nextBal,
          };
        }
        if (payload.type === 'partner_deposit') {
          const nextDeposits = prt.totalDeposits + payload.amount;
          const nextBal = prt.currentBalance + payload.amount;
          partyBalanceAfter = nextBal;
          return {
            ...prt,
            totalDeposits: nextDeposits,
            currentBalance: nextBal,
          };
        }
        return prt;
      });
      this.savePartners(updatedPartners);
    }

    // 4. Update Employee advances / custody if staff_advance or staff_custody_settlement
    if (payload.employeeId) {
      const employees = this.getEmployees();
      const updatedEmployees = employees.map((emp) => {
        if (emp.id !== payload.employeeId) return emp;
        if (payload.type === 'staff_advance') {
          const nextAdv = emp.currentAdvances + payload.amount;
          partyBalanceAfter = nextAdv;
          return {
            ...emp,
            currentAdvances: nextAdv,
          };
        }
        if (payload.type === 'staff_custody_settlement') {
          if (emp.custodyBalance >= payload.amount) {
            const nextCust = emp.custodyBalance - payload.amount;
            partyBalanceAfter = nextCust;
            return { ...emp, custodyBalance: nextCust };
          } else {
            const nextAdv = Math.max(0, emp.currentAdvances - payload.amount);
            partyBalanceAfter = nextAdv;
            return { ...emp, currentAdvances: nextAdv };
          }
        }
        return emp;
      });
      this.saveEmployees(updatedEmployees);
    }

    const activeUser = this.getActiveUser();
    const newVoucher: Voucher = {
      ...payload,
      id: `vch-${Date.now()}`,
      voucherNumber,
      date: getTodayDateString(),
      time: getCurrentTimeString(),
      financialContainer: payload.financialContainer || 'shift_drawer',
      performedByUserId: payload.performedByUserId || activeUser.id,
      performedByRole: payload.performedByRole || activeUser.role,
      partyBalanceAfter:
        partyBalanceAfter !== undefined ? partyBalanceAfter : payload.partyBalanceAfter,
    };

    localStorage.setItem(KEYS.VOUCHERS, JSON.stringify([newVoucher, ...all]));
    return newVoucher;
  }

  // --- Sale Orders (POS) ---
  static getSaleOrders(shiftId?: string): SaleOrder[] {
    try {
      const raw = localStorage.getItem(KEYS.SALE_ORDERS);
      const list: SaleOrder[] = raw ? JSON.parse(raw) : DEFAULT_SALE_ORDERS;
      if (!raw) {
        localStorage.setItem(KEYS.SALE_ORDERS, JSON.stringify(DEFAULT_SALE_ORDERS));
      }
      if (shiftId) {
        return list.filter((o) => o.shiftId === shiftId);
      }
      return list;
    } catch {
      return DEFAULT_SALE_ORDERS;
    }
  }

  static saveSaleOrders(orders: SaleOrder[]): void {
    localStorage.setItem(KEYS.SALE_ORDERS, JSON.stringify(orders));
  }

  static createSaleOrder(params: {
    shiftId: string;
    cashierName: string;
    orderType?: OrderType;
    tableNumber?: string;
    tableGuests?: number;
    deliveryFeeMinor?: number;
    deliveryDriverId?: string;
    deliveryAddress?: string;
    deliveryPhone?: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod: PaymentMethod;
    paymentRef?: string;
    customerId?: string;
    lines: {
      menuItemId: string;
      qty: number;
      notes?: string;
      kitchenStationId?: string;
    }[];
    discountMinor: number;
    couponCode?: string;
    promotionTitle?: string;
    promotionDiscountMinor?: number;
    notes?: string;
  }): SaleOrder {
    const settings = this.getSettings();
    const isRetail = settings.businessType === 'retail';
    const menuItems = this.getMenuItems();
    const inventory = this.getInventory();
    const customers = this.getCustomers();
    const kitchenStations = this.getKitchenStations();
    const drivers = this.getDeliveryDrivers();

    const orderType: OrderType = params.orderType || 'takeaway';
    const paymentStatus: PaymentStatus = params.paymentStatus || 'paid';
    const orderStatus: OrderStatus =
      params.orderStatus || (paymentStatus === 'unpaid' ? 'in_kitchen' : 'delivered');

    let matchedDriver: DeliveryDriver | undefined;
    if (params.deliveryDriverId) {
      matchedDriver = drivers.find((d) => d.id === params.deliveryDriverId);
    }

    // Validate credit customer if paymentMethod === 'credit'
    let matchedCustomer: Customer | undefined;
    if (params.customerId) {
      matchedCustomer = customers.find((c) => c.id === params.customerId);
    }

    if (params.paymentMethod === 'credit') {
      if (!matchedCustomer) {
        throw new Error('البيع الآجل متاح فقط للعملاء المسجلين في النظام.');
      }
      if (!matchedCustomer.allowCredit) {
        throw new Error(
          `العميل "${matchedCustomer.name}" غير مصرح له بالبيع الآجل. يرجى مراجعة الإدارة.`
        );
      }
    }

    // Build order lines with kitchen stations and preparation notes
    const builtLines = params.lines.map((lineReq) => {
      if (isRetail) {
        const invItem = inventory.find((i) => i.id === lineReq.menuItemId);
        if (!invItem) {
          throw new Error('صنف غير موجود في المخزون');
        }
        const unitPrice = invItem.salePrice || invItem.unitCost;
        const unitTheoreticalCost = invItem.unitCost;
        return {
          menuItemId: invItem.id,
          code: invItem.code,
          menuItemName: invItem.name,
          qty: lineReq.qty,
          unitPrice,
          unitTheoreticalCost,
          totalPrice: unitPrice * lineReq.qty,
          totalTheoreticalCost: unitTheoreticalCost * lineReq.qty,
          notes: lineReq.notes?.trim() || undefined,
        };
      } else {
        const dish = menuItems.find((m) => m.id === lineReq.menuItemId);
        if (!dish) {
          throw new Error('الطبق غير موجود في المنيو');
        }
        const stationId = lineReq.kitchenStationId || dish.kitchenStationId;
        const station = kitchenStations.find((st) => st.id === stationId);
        return {
          menuItemId: dish.id,
          code: dish.code,
          menuItemName: dish.name,
          qty: lineReq.qty,
          unitPrice: dish.sellingPrice,
          unitTheoreticalCost: dish.theoreticalCost,
          totalPrice: dish.sellingPrice * lineReq.qty,
          totalTheoreticalCost: dish.theoreticalCost * lineReq.qty,
          kitchenStationId: station?.id,
          kitchenStationName: station?.name,
          notes: lineReq.notes?.trim() || undefined,
        };
      }
    });

    const subtotal = builtLines.reduce((s, l) => s + l.totalPrice, 0);
    const discount = Math.min(subtotal, Math.max(0, params.discountMinor || 0));
    const deliveryFee = orderType === 'delivery' ? Math.max(0, params.deliveryFeeMinor || 0) : 0;
    const totalAmount = subtotal - discount + deliveryFee;
    const totalTheoreticalCost = builtLines.reduce((s, l) => s + l.totalTheoreticalCost, 0);

    // Check customer credit limit if credit sale
    let customerBalanceAfter: number | undefined;
    if (params.paymentMethod === 'credit' && matchedCustomer) {
      const projectedDebt = matchedCustomer.currentDebt + totalAmount;
      if (matchedCustomer.creditLimit > 0 && projectedDebt > matchedCustomer.creditLimit) {
        throw new Error(
          `تجاوز الحد الائتماني المسموح للعميل (${formatCurrency(
            matchedCustomer.creditLimit,
            settings.currency
          )}). المديونية بعد الفاتورة ستصبح ${formatCurrency(
            projectedDebt,
            settings.currency
          )}.`
        );
      }
      customerBalanceAfter = projectedDebt;
    }

    // Deduct stock from inventory
    const updatedInventory = [...inventory];
    for (const line of builtLines) {
      if (isRetail) {
        const idx = updatedInventory.findIndex((i) => i.id === line.menuItemId);
        if (idx !== -1) {
          updatedInventory[idx] = {
            ...updatedInventory[idx],
            currentStock: Math.max(
              0,
              Number((updatedInventory[idx].currentStock - line.qty).toFixed(3))
            ),
            lastUpdated: getTodayDateString(),
          };
        }
      } else {
        const dish = menuItems.find((m) => m.id === line.menuItemId);
        if (dish && dish.ingredients) {
          for (const ing of dish.ingredients) {
            const idx = updatedInventory.findIndex((i) => i.id === ing.inventoryItemId);
            if (idx !== -1) {
              const deductQty = ing.qty * line.qty;
              updatedInventory[idx] = {
                ...updatedInventory[idx],
                currentStock: Math.max(
                  0,
                  Number((updatedInventory[idx].currentStock - deductQty).toFixed(3))
                ),
                lastUpdated: getTodayDateString(),
              };
            }
          }
        }
      }
    }
    this.saveInventory(updatedInventory);

    // Update customer debt if credit
    if (params.paymentMethod === 'credit' && matchedCustomer && customerBalanceAfter !== undefined) {
      const updatedCustomers = customers.map((c) =>
        c.id === matchedCustomer.id ? { ...c, currentDebt: customerBalanceAfter! } : c
      );
      this.saveCustomers(updatedCustomers);
    }

    // If paid right now, update shift sales bucket
    if (paymentStatus === 'paid') {
      const shifts = this.getShifts();
      const updatedShifts = shifts.map((sh) => {
        if (sh.id !== params.shiftId) return sh;
        return {
          ...sh,
          cashSales:
            params.paymentMethod === 'cash' ? sh.cashSales + totalAmount : sh.cashSales,
          visaSales:
            params.paymentMethod === 'visa' ? sh.visaSales + totalAmount : sh.visaSales,
          instapaySales:
            params.paymentMethod === 'instapay'
              ? (sh.instapaySales || 0) + totalAmount
              : sh.instapaySales || 0,
          ewalletSales:
            params.paymentMethod === 'ewallet'
              ? (sh.ewalletSales || 0) + totalAmount
              : sh.ewalletSales || 0,
          creditSales:
            params.paymentMethod === 'credit'
              ? (sh.creditSales || 0) + totalAmount
              : sh.creditSales || 0,
        };
      });
      this.saveShifts(updatedShifts);
    }

    // Update delivery driver tracking if assigned
    if (matchedDriver) {
      const updatedDrivers = drivers.map((d) => {
        if (d.id !== matchedDriver!.id) return d;
        const addCustody =
          paymentStatus === 'unpaid' && params.paymentMethod === 'cash' ? totalAmount : 0;
        return {
          ...d,
          currentOrdersCount: d.currentOrdersCount + 1,
          cashInCustodyMinor: d.cashInCustodyMinor + addCustody,
          totalDeliveredCount:
            orderStatus === 'delivered' ? d.totalDeliveredCount + 1 : d.totalDeliveredCount,
        };
      });
      this.saveDeliveryDrivers(updatedDrivers);
    }

    const allOrders = this.getSaleOrders();
    const today = getTodayDateString();
    const todayOrdersCount = allOrders.filter((o) => o.date === today).length;
    const dailySequenceNumber = todayOrdersCount + 1;

    const shifts = this.getShifts();
    const activeShiftObj = shifts.find((s) => s.id === params.shiftId);
    const shiftNum = activeShiftObj ? activeShiftObj.shiftNumber : 100;
    const orderNumber = `INV-${shiftNum}-${String(allOrders.length + 1).padStart(3, '0')}`;

    const newOrder: SaleOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      dailySequenceNumber,
      orderType,
      tableNumber: orderType === 'dine_in' ? params.tableNumber?.trim() || '1' : undefined,
      tableGuests: orderType === 'dine_in' ? params.tableGuests : undefined,
      deliveryFee: orderType === 'delivery' ? deliveryFee : undefined,
      deliveryDriverId: matchedDriver?.id,
      deliveryDriverName: matchedDriver?.name,
      deliveryAddress: orderType === 'delivery' ? params.deliveryAddress?.trim() : undefined,
      deliveryPhone: orderType === 'delivery' ? params.deliveryPhone?.trim() : undefined,
      orderStatus,
      paymentStatus,
      kotPrinted: false,
      shiftId: params.shiftId,
      date: today,
      time: getCurrentTimeString(),
      cashierName: params.cashierName,
      paymentMethod: params.paymentMethod,
      paymentRef: params.paymentRef,
      customerId: matchedCustomer?.id,
      customerName: matchedCustomer?.name,
      customerPhone: matchedCustomer?.phone,
      customerBalanceAfter,
      lines: builtLines,
      subtotal,
      discount,
      couponCode: params.couponCode,
      promotionTitle: params.promotionTitle,
      promotionDiscount: params.promotionDiscountMinor,
      totalAmount,
      totalTheoreticalCost,
      notes: params.notes,
    };

    if (params.couponCode) {
      this.incrementPromotionUsage(params.couponCode);
    }

    localStorage.setItem(KEYS.SALE_ORDERS, JSON.stringify([newOrder, ...allOrders]));
    return newOrder;
  }

  static getOpenOrders(shiftId?: string): SaleOrder[] {
    const all = this.getSaleOrders(shiftId);
    return all.filter(
      (o) =>
        o.paymentStatus === 'unpaid' ||
        o.orderStatus === 'in_kitchen' ||
        o.orderStatus === 'ready' ||
        o.orderStatus === 'out_for_delivery'
    );
  }

  static updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    driverId?: string
  ): SaleOrder | null {
    const all = this.getSaleOrders();
    const order = all.find((o) => o.id === orderId);
    if (!order) return null;

    let driverName = order.deliveryDriverName;
    if (driverId) {
      const drivers = this.getDeliveryDrivers();
      const drv = drivers.find((d) => d.id === driverId);
      if (drv) {
        driverName = drv.name;
        if (
          status === 'out_for_delivery' &&
          order.paymentStatus === 'unpaid' &&
          order.paymentMethod === 'cash'
        ) {
          this.saveDeliveryDrivers(
            drivers.map((d) =>
              d.id === drv.id
                ? {
                    ...d,
                    cashInCustodyMinor: d.cashInCustodyMinor + order.totalAmount,
                  }
                : d
            )
          );
        }
      }
    }

    const updatedOrder: SaleOrder = {
      ...order,
      orderStatus: status,
      deliveryDriverId: driverId || order.deliveryDriverId,
      deliveryDriverName: driverName,
    };

    this.saveSaleOrders(all.map((o) => (o.id === orderId ? updatedOrder : o)));
    return updatedOrder;
  }

  static payAndCloseOrder(params: {
    orderId: string;
    paymentMethod: PaymentMethod;
    paymentRef?: string;
    cashierName?: string;
  }): SaleOrder {
    const all = this.getSaleOrders();
    const order = all.find((o) => o.id === params.orderId);
    if (!order) throw new Error('الطلب غير موجود');
    if (order.paymentStatus === 'paid') return order;

    let customerBalanceAfter = order.customerBalanceAfter;
    if (params.paymentMethod === 'credit' && order.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === order.customerId);
      if (customer) {
        customerBalanceAfter = customer.currentDebt + order.totalAmount;
        this.saveCustomers(
          customers.map((c) =>
            c.id === customer.id ? { ...c, currentDebt: customerBalanceAfter! } : c
          )
        );
      }
    }

    // Update shift sales bucket
    const shifts = this.getShifts();
    const updatedShifts = shifts.map((sh) => {
      if (sh.id !== order.shiftId) return sh;
      return {
        ...sh,
        cashSales:
          params.paymentMethod === 'cash' ? sh.cashSales + order.totalAmount : sh.cashSales,
        visaSales:
          params.paymentMethod === 'visa' ? sh.visaSales + order.totalAmount : sh.visaSales,
        instapaySales:
          params.paymentMethod === 'instapay'
            ? (sh.instapaySales || 0) + order.totalAmount
            : sh.instapaySales || 0,
        ewalletSales:
          params.paymentMethod === 'ewallet'
            ? (sh.ewalletSales || 0) + order.totalAmount
            : sh.ewalletSales || 0,
        creditSales:
          params.paymentMethod === 'credit'
            ? (sh.creditSales || 0) + order.totalAmount
            : sh.creditSales || 0,
      };
    });
    this.saveShifts(updatedShifts);

    // If delivery driver delivered this order, increment driver's totalDeliveredCount
    if (order.deliveryDriverId) {
      const drivers = this.getDeliveryDrivers();
      this.saveDeliveryDrivers(
        drivers.map((d) =>
          d.id === order.deliveryDriverId
            ? {
                ...d,
                totalDeliveredCount: d.totalDeliveredCount + 1,
                currentOrdersCount: Math.max(0, d.currentOrdersCount - 1),
              }
            : d
        )
      );
    }

    const updatedOrder: SaleOrder = {
      ...order,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      paymentMethod: params.paymentMethod,
      paymentRef: params.paymentRef,
      customerBalanceAfter,
      cashierName: params.cashierName || order.cashierName,
    };

    this.saveSaleOrders(all.map((o) => (o.id === params.orderId ? updatedOrder : o)));
    return updatedOrder;
  }

  static markKOTPrinted(orderId: string): void {
    const all = this.getSaleOrders();
    const updated = all.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        kotPrinted: true,
        kotPrintTime: getCurrentTimeString(),
        kotPrintCount: (o.kotPrintCount || 0) + 1,
      };
    });
    this.saveSaleOrders(updated);
  }

  // --- Shift Cash Calculation ---
  static calculateShiftCash(shift: Shift): ShiftCashCalculation {
    const vouchers = this.getVouchers(shift.id);
    // Only cash movements targeting the shift drawer (or legacy undefined) impact drawer cash
    const drawerVouchers = vouchers.filter(
      (v) => !v.financialContainer || v.financialContainer === 'shift_drawer'
    );

    const totalReceipts = drawerVouchers
      .filter(
        (v) =>
          v.type === 'receipt' ||
          v.type === 'customer_collection' ||
          v.type === 'partner_deposit' ||
          v.type === 'staff_custody_settlement'
      )
      .reduce((sum, v) => sum + v.amount, 0);

    const totalExpenses = drawerVouchers
      .filter(
        (v) =>
          v.type === 'expense' ||
          v.type === 'supplier_payment' ||
          v.type === 'staff_advance' ||
          v.type === 'partner_drawing'
      )
      .reduce((sum, v) => sum + v.amount, 0);

    const totalCreditPurchases = vouchers
      .filter((v) => v.type === 'credit_purchase')
      .reduce((sum, v) => sum + v.amount, 0);

    const cashSales = shift.cashSales || 0;
    const visaSales = shift.visaSales || 0;
    const instapaySales = shift.instapaySales || 0;
    const ewalletSales = shift.ewalletSales || 0;
    const creditSales = shift.creditSales || 0;

    const totalElectronicSales = visaSales + instapaySales + ewalletSales;
    const totalSales = cashSales + totalElectronicSales + creditSales;
    const expectedCashInDrawer =
      shift.openingCustody + cashSales + totalReceipts - totalExpenses;

    return {
      openingCustody: shift.openingCustody,
      cashSales,
      visaSales,
      instapaySales,
      ewalletSales,
      creditSales,
      totalSales,
      totalElectronicSales,
      totalReceipts,
      totalExpenses,
      totalCreditPurchases,
      expectedCashInDrawer,
    };
  }

  // --- Excel Export ---
  static exportToExcel(): void {
    const wb = XLSX.utils.book_new();
    const shifts = this.getShifts();
    const vouchers = this.getVouchers();
    const orders = this.getSaleOrders();
    const inventory = this.getInventory();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        orders.map((o) => ({
          رقم_الفاتورة: o.orderNumber,
          التاريخ: o.date,
          الوقت: o.time,
          الكاشير: o.cashierName,
          طريقة_الدفع: getPaymentMethodLabel(o.paymentMethod),
          العميل: o.customerName || 'نقدي',
          الإجمالي: o.totalAmount / 100,
          التكلفة_المعيارية: o.totalTheoreticalCost / 100,
          الربح_المتوقع: (o.totalAmount - o.totalTheoreticalCost) / 100,
        }))
      ),
      'فواتير_المبيعات'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        vouchers.map((v) => ({
          رقم_السند: v.voucherNumber,
          النوع: v.type,
          التاريخ: v.date,
          الوقت: v.time,
          المبلغ: v.amount / 100,
          الحساب: v.accountName,
          المستفيد: v.recipient,
          البيان: v.description,
          الكاشير: v.cashierName,
        }))
      ),
      'سندات_الخزينة'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        inventory.map((i) => ({
          الكود: i.code,
          الصنف: i.name,
          القسم: i.category,
          الوحدة: i.unit,
          الرصيد_الحالي: i.currentStock,
          تكلفة_الوحدة: i.unitCost / 100,
        }))
      ),
      'المخزون'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        customers.map((c) => ({
          الكود: c.code,
          العميل: c.name,
          الهاتف: c.phone,
          مسموح_بالآجل: c.allowCredit ? 'نعم' : 'لا',
          الحد_الائتماني: c.creditLimit / 100,
          المديونية_الحالية: c.currentDebt / 100,
        }))
      ),
      'العملاء_الآجل'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        suppliers.map((s) => ({
          الكود: s.code,
          المورد: s.name,
          الهاتف: s.phone,
          الرصيد_المستحق: s.creditBalance / 100,
        }))
      ),
      'الموردين'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        shifts.map((s) => ({
          رقم_الوردية: s.shiftNumber,
          الكاشير: s.cashierName,
          التاريخ: s.date,
          الحالة: s.status,
          عهدة_الافتتاح: s.openingCustody / 100,
          مبيعات_نقدية: s.cashSales / 100,
          مبيعات_فيزا: s.visaSales / 100,
        }))
      ),
      'الورديات'
    );

    XLSX.writeFile(wb, `FastRest_POS_Report_${getTodayDateString()}.xlsx`);
  }
}
