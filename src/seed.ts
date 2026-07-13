import { products, expenses } from './domain';
import { KmsSnapshot } from './kms';

export const seedData: KmsSnapshot = {
  users: [
    { id: 1, fullName: 'System Administrator', username: 'admin', passwordHash: 'admin-demo-hash', role: 'ADMIN', preferredLanguage: 'en', status: 'ACTIVE' },
    { id: 2, fullName: 'Cashier User', username: 'cashier', passwordHash: 'cashier-demo-hash', role: 'STAFF', preferredLanguage: 'ar', status: 'ACTIVE' }
  ],
  categories: [
    { id: 1, nameEn: 'Sandwiches', nameAr: 'ساندويتشات' },
    { id: 2, nameEn: 'Drinks', nameAr: 'مشروبات' },
    { id: 3, nameEn: 'Chips', nameAr: 'شيبس' },
    { id: 4, nameEn: 'Chocolate', nameAr: 'شوكولاتة' },
    { id: 5, nameEn: 'Dairy', nameAr: 'ألبان' },
    { id: 6, nameEn: 'Frozen Food', nameAr: 'أطعمة مجمدة' }
  ],
  suppliers: [
    { id: 1, name: 'Fresh Foods', contactPerson: 'Omar', phone: '+970-000-1000' },
    { id: 2, name: 'Cold Drinks Co.', contactPerson: 'Sara', phone: '+970-000-2000' },
    { id: 3, name: 'Snack House', contactPerson: 'Lina', phone: '+970-000-3000' }
  ],
  products,
  purchases: [],
  sales: [],
  expenses,
  movements: [],
  settings: { storeName: 'KMS Demo Store', currency: 'USD', language: 'en', receiptFooter: 'Thank you for shopping with us', taxPercentage: 0, backupLocation: './backups' }
};
