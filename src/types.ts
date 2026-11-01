export type BusinessType = 'restaurant' | 'retail';

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
  | 'staff_custody_settlement';

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
}

