import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: { translation: { app: 'Kiosk Management System', dashboard: 'Dashboard', pos: 'Point of Sale', products: 'Products', inventory: 'Inventory', suppliers: 'Suppliers', purchases: 'Purchases', reports: 'Reports', users: 'Users', settings: 'Settings', backup: 'Backup & Restore', todaySales: "Today's Sales", todayProfit: "Today's Profit", monthlyRevenue: 'Monthly Revenue', monthlyProfit: 'Monthly Profit', inventoryValue: 'Inventory Value', expenses: 'Expenses', netProfit: 'Net Profit', lowStock: 'Low Stock', outOfStock: 'Out of Stock', negativeMargin: 'Negative Margin', barcode: 'Barcode', search: 'Search by barcode, Arabic, or English name', checkout: 'Checkout & Print Receipt' } },
  ar: { translation: { app: 'نظام إدارة الكشك', dashboard: 'لوحة التحكم', pos: 'نقطة البيع', products: 'المنتجات', inventory: 'المخزون', suppliers: 'الموردون', purchases: 'المشتريات', reports: 'التقارير', users: 'المستخدمون', settings: 'الإعدادات', backup: 'النسخ والاستعادة', todaySales: 'مبيعات اليوم', todayProfit: 'ربح اليوم', monthlyRevenue: 'إيراد الشهر', monthlyProfit: 'ربح الشهر', inventoryValue: 'قيمة المخزون', expenses: 'المصاريف', netProfit: 'صافي الربح', lowStock: 'مخزون منخفض', outOfStock: 'نفد المخزون', negativeMargin: 'هامش سلبي', barcode: 'الباركود', search: 'البحث بالباركود أو الاسم العربي أو الإنجليزي', checkout: 'الدفع وطباعة الإيصال' } }
};

i18n.use(initReactI18next).init({ resources, lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
