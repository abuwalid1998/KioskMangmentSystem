import { KmsStore } from './kms';
import { seedData } from './seed';
import { exportProductsCsv, printableReceipt } from './exporters';
import { MemorySnapshotStorage } from './storage';

function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }

const store = new KmsStore(seedData);
const admin = store.authenticate('admin', 'admin-demo-hash');
assert(admin?.role === 'ADMIN', 'admin can authenticate');
assert(store.searchProducts('10001').length === 1, 'barcode search works');
const purchase = store.createPurchase(1, 'P-001', [{ productId: 1, quantity: 6, purchasePrice: 1.45 }]);
assert(purchase.total === 8.7, 'purchase total calculated');
const product = store.searchProducts('Cheese')[0];
const sale = store.createSale(1, [{ product, quantity: 2, discount: 0 }], 'CASH');
assert(sale.receiptNumber.startsWith('R-'), 'sale receipt generated');
assert(store.reports().bestSellers[0].quantity === 2, 'best seller report calculated');
assert(store.backup().includes('KMS Demo Store'), 'backup exports state');
assert(exportProductsCsv(store.snapshot().products).includes('Barcode'), 'product CSV export works');
assert(printableReceipt(sale, seedData.settings.storeName, seedData.settings.receiptFooter).includes('Receipt'), 'receipt print text works');

const storage = new MemorySnapshotStorage();
storage.save(store.snapshot());
assert(storage.load().products.length === store.snapshot().products.length, 'snapshot storage round-trips state');
