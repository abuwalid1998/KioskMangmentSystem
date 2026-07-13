export type Role = 'ADMIN' | 'STAFF';
export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED';
export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'DAMAGED' | 'EXPIRED' | 'RETURNED';

export interface Product { id: number; barcode: string; nameAr: string; nameEn: string; category: string; supplier: string; purchasePrice: number; sellingPrice: number; quantity: number; minimumQuantity: number; unit: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface CartLine { product: Product; quantity: number; discount: number; }
export interface Movement { productId: number; type: MovementType; quantity: number; beforeQty: number; afterQty: number; reference: string; }
export interface Expense { category: string; amount: number; }

export const products: Product[] = [
  { id: 1, barcode: '10001', nameAr: 'ساندويتش جبنة', nameEn: 'Cheese Sandwich', category: 'Sandwiches', supplier: 'Fresh Foods', purchasePrice: 1.5, sellingPrice: 2.5, quantity: 34, minimumQuantity: 8, unit: 'pcs', status: 'ACTIVE' },
  { id: 2, barcode: '20001', nameAr: 'عصير برتقال', nameEn: 'Orange Juice', category: 'Drinks', supplier: 'Cold Drinks Co.', purchasePrice: 0.75, sellingPrice: 1.25, quantity: 7, minimumQuantity: 10, unit: 'bottle', status: 'ACTIVE' },
  { id: 3, barcode: '30001', nameAr: 'شيبس مملح', nameEn: 'Salted Chips', category: 'Chips', supplier: 'Snack House', purchasePrice: 0.4, sellingPrice: 0.35, quantity: 0, minimumQuantity: 12, unit: 'bag', status: 'ACTIVE' }
];
export const expenses: Expense[] = [{ category: 'Rent', amount: 320 }, { category: 'Electricity', amount: 45 }];
export const movements: Movement[] = [];

export function assertCanSell(lines: CartLine[]): string[] { return lines.filter(l => l.quantity > l.product.quantity).map(l => `${l.product.nameEn} exceeds available stock`); }
export function profit(line: CartLine) { return (line.product.sellingPrice - line.product.purchasePrice) * line.quantity - line.discount; }
export function checkout(lines: CartLine[], paymentMethod: PaymentMethod): Movement[] {
  const errors = assertCanSell(lines); if (errors.length) throw new Error(errors.join(', '));
  const receipt = `R-${Date.now()}`;
  const saleMovements = lines.map(({ product, quantity }) => { const beforeQty = product.quantity; product.quantity -= quantity; return { productId: product.id, type: 'SALE' as const, quantity, beforeQty, afterQty: product.quantity, reference: receipt }; });
  movements.push(...saleMovements); console.info('receipt', receipt, paymentMethod); return saleMovements;
}
