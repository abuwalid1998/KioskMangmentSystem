import { CartLine, Expense, Movement, PaymentMethod, Product, Role } from './domain';

export type Language = 'en' | 'ar';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type ExpenseCategory = 'Rent' | 'Electricity' | 'Water' | 'Internet' | 'Salaries' | 'Maintenance' | 'Miscellaneous';

export interface UserProfile {
  id: number;
  fullName: string;
  username: string;
  passwordHash: string;
  role: Role;
  preferredLanguage: Language;
  status: EntityStatus;
}

export interface Category { id: number; nameEn: string; nameAr: string; }
export interface Supplier { id: number; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string; }
export interface PurchaseLine { productId: number; quantity: number; purchasePrice: number; }
export interface PurchaseInvoice { id: number; supplierId: number; invoiceNumber: string; date: string; items: PurchaseLine[]; total: number; }
export interface SaleInvoice { id: number; receiptNumber: string; cashierId: number; date: string; items: CartLine[]; subtotal: number; discount: number; total: number; costOfGoods: number; paymentMethod: PaymentMethod; }
export interface SystemSettings { storeName: string; currency: string; language: Language; receiptFooter: string; taxPercentage: number; backupLocation: string; }

export interface DashboardMetrics {
  dailyRevenue: number;
  dailyProfit: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  grossMargin: number;
  netMargin: number;
  inventoryValue: number;
  averageSaleValue: number;
  lowInventoryCount: number;
  supplierPurchaseValue: number;
  expenses: number;
  netProfit: number;
}

export interface ReportBundle {
  sales: SaleInvoice[];
  lowStock: Product[];
  outOfStock: Product[];
  inventoryValue: number;
  grossProfit: number;
  netProfit: number;
  bestSellers: Array<{ product: Product; quantity: number }>;
  slowMovingProducts: Product[];
}

export interface KmsSnapshot {
  users: UserProfile[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseInvoice[];
  sales: SaleInvoice[];
  expenses: Expense[];
  movements: Movement[];
  settings: SystemSettings;
}

export class KmsStore {
  private state: KmsSnapshot;

  constructor(seed: KmsSnapshot) { this.state = structuredClone(seed); }
  snapshot(): KmsSnapshot { return structuredClone(this.state); }

  authenticate(username: string, passwordHash: string) {
    return this.state.users.find(user => user.username === username && user.passwordHash === passwordHash && user.status === 'ACTIVE') ?? null;
  }

  requireAdmin(user: UserProfile) { if (user.role !== 'ADMIN') throw new Error('Administrator permission required'); }

  createProduct(product: Omit<Product, 'id'>, actor: UserProfile, approvedBelowCost = false) {
    if (this.state.products.some(existing => existing.barcode === product.barcode)) throw new Error('Barcode values must be unique');
    if (product.sellingPrice < product.purchasePrice && !(approvedBelowCost && actor.role === 'ADMIN')) throw new Error('Selling below cost requires administrator approval');
    const next: Product = { ...product, id: this.nextId(this.state.products) };
    this.state.products.push(next);
    return structuredClone(next);
  }

  updateProduct(id: number, patch: Partial<Omit<Product, 'id'>>, actor: UserProfile, approvedBelowCost = false) {
    const product = this.findProduct(id);
    if (patch.barcode && this.state.products.some(existing => existing.id !== id && existing.barcode === patch.barcode)) throw new Error('Barcode values must be unique');
    const next = { ...product, ...patch };
    if (next.sellingPrice < next.purchasePrice && !(approvedBelowCost && actor.role === 'ADMIN')) throw new Error('Selling below cost requires administrator approval');
    Object.assign(product, patch);
    return structuredClone(product);
  }

  deleteProduct(id: number, actor: UserProfile) {
    this.requireAdmin(actor);
    const product = this.findProduct(id);
    product.status = 'INACTIVE';
    return structuredClone(product);
  }

  searchProducts(term: string) {
    const normalized = term.trim().toLowerCase();
    return this.state.products.filter(product => [product.barcode, product.nameAr, product.nameEn].some(value => value.toLowerCase().includes(normalized)) && product.status === 'ACTIVE');
  }

  createPurchase(supplierId: number, invoiceNumber: string, items: PurchaseLine[]) {
    if (this.state.purchases.some(purchase => purchase.invoiceNumber === invoiceNumber)) throw new Error('Purchase invoice number must be unique');
    const purchase: PurchaseInvoice = { id: this.nextId(this.state.purchases), supplierId, invoiceNumber, date: new Date().toISOString(), items: structuredClone(items), total: items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0) };
    items.forEach(item => {
      const product = this.findProduct(item.productId);
      const beforeQty = product.quantity;
      product.quantity += item.quantity;
      product.purchasePrice = item.purchasePrice;
      this.state.movements.push({ productId: product.id, type: 'PURCHASE', quantity: item.quantity, beforeQty, afterQty: product.quantity, reference: invoiceNumber });
    });
    this.state.purchases.push(purchase);
    return structuredClone(purchase);
  }

  createSale(cashierId: number, items: CartLine[], paymentMethod: PaymentMethod, discount = 0) {
    items.forEach(line => { if (line.quantity > this.findProduct(line.product.id).quantity) throw new Error('Inventory cannot become negative'); });
    const receiptNumber = `R-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${this.state.sales.length + 1}`;
    const subtotal = items.reduce((sum, line) => sum + line.product.sellingPrice * line.quantity - line.discount, 0);
    const costOfGoods = items.reduce((sum, line) => sum + line.product.purchasePrice * line.quantity, 0);
    const sale: SaleInvoice = { id: this.nextId(this.state.sales), receiptNumber, cashierId, date: new Date().toISOString(), items: structuredClone(items), subtotal, discount, total: subtotal - discount, costOfGoods, paymentMethod };
    items.forEach(line => {
      const product = this.findProduct(line.product.id);
      const beforeQty = product.quantity;
      product.quantity -= line.quantity;
      this.state.movements.push({ productId: product.id, type: 'SALE', quantity: line.quantity, beforeQty, afterQty: product.quantity, reference: receiptNumber });
    });
    this.state.sales.push(sale);
    return structuredClone(sale);
  }

  addExpense(category: ExpenseCategory, amount: number) { this.state.expenses.push({ category, amount }); }

  dashboard(now = new Date()): DashboardMetrics {
    const today = now.toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const todaySales = this.state.sales.filter(sale => sale.date.startsWith(today));
    const monthSales = this.state.sales.filter(sale => sale.date.startsWith(month));
    const expenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);
    const monthlyProfit = monthSales.reduce((sum, sale) => sum + sale.total - sale.costOfGoods, 0);
    return {
      dailyRevenue: todaySales.reduce((sum, sale) => sum + sale.total, 0),
      dailyProfit: todaySales.reduce((sum, sale) => sum + sale.total - sale.costOfGoods, 0),
      monthlyRevenue,
      monthlyProfit,
      grossMargin: monthlyRevenue ? monthlyProfit / monthlyRevenue * 100 : 0,
      netMargin: monthlyRevenue ? (monthlyProfit - expenses) / monthlyRevenue * 100 : 0,
      inventoryValue: this.state.products.reduce((sum, product) => sum + product.purchasePrice * product.quantity, 0),
      averageSaleValue: monthSales.length ? monthlyRevenue / monthSales.length : 0,
      lowInventoryCount: this.state.products.filter(product => product.quantity <= product.minimumQuantity).length,
      supplierPurchaseValue: this.state.purchases.reduce((sum, purchase) => sum + purchase.total, 0),
      expenses,
      netProfit: monthlyProfit - expenses
    };
  }

  reports(): ReportBundle {
    const quantities = new Map<number, number>();
    this.state.sales.flatMap(sale => sale.items).forEach(line => quantities.set(line.product.id, (quantities.get(line.product.id) ?? 0) + line.quantity));
    const sorted = [...quantities.entries()].sort((a, b) => b[1] - a[1]);
    const grossProfit = this.state.sales.reduce((sum, sale) => sum + sale.total - sale.costOfGoods, 0);
    const expenses = this.state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      sales: structuredClone(this.state.sales),
      lowStock: this.state.products.filter(product => product.quantity <= product.minimumQuantity && product.quantity > 0),
      outOfStock: this.state.products.filter(product => product.quantity === 0),
      inventoryValue: this.state.products.reduce((sum, product) => sum + product.purchasePrice * product.quantity, 0),
      grossProfit,
      netProfit: grossProfit - expenses,
      bestSellers: sorted.slice(0, 10).map(([id, quantity]) => ({ product: structuredClone(this.findProduct(id)), quantity })),
      slowMovingProducts: this.state.products.filter(product => !quantities.has(product.id))
    };
  }

  backup() { return JSON.stringify(this.state, null, 2); }
  restore(backupJson: string) { this.state = JSON.parse(backupJson) as KmsSnapshot; return this.snapshot(); }

  private findProduct(id: number) {
    const product = this.state.products.find(item => item.id === id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  private nextId(items: Array<{ id: number }>) { return items.length ? Math.max(...items.map(item => item.id)) + 1 : 1; }
}
