import express from 'express';
import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
export const app = express();
app.use(express.json({ limit: '25mb' }));

function requireAdmin(role?: Role) { if (role !== 'ADMIN') throw new Error('Administrator permission required'); }
function receiptNumber() { return `R-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`; }
function asNumber(value: unknown) { return Number(value ?? 0); }

app.post('/auth/login', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { username: req.body.username } });
  if (!user || user.status !== 'ACTIVE' || !bcrypt.compareSync(req.body.password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ id: user.id, fullName: user.fullName, role: user.role, preferredLanguage: user.preferredLanguage });
});

app.get('/categories', async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { nameEn: 'asc' } })));
app.post('/categories', async (req, res) => res.status(201).json(await prisma.category.create({ data: { nameEn: req.body.nameEn, nameAr: req.body.nameAr } })));
app.put('/categories/:id', async (req, res) => res.json(await prisma.category.update({ where: { id: Number(req.params.id) }, data: { nameEn: req.body.nameEn, nameAr: req.body.nameAr } })));
app.delete('/categories/:id', async (req, res) => { requireAdmin(req.body.actorRole); await prisma.category.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); });

app.get('/suppliers', async (_req, res) => res.json(await prisma.supplier.findMany({ include: { products: true, purchases: true }, orderBy: { name: 'asc' } })));
app.post('/suppliers', async (req, res) => res.status(201).json(await prisma.supplier.create({ data: req.body })));
app.put('/suppliers/:id', async (req, res) => res.json(await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: req.body })));
app.delete('/suppliers/:id', async (req, res) => { requireAdmin(req.body.actorRole); await prisma.supplier.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); });

app.get('/products', async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  res.json(await prisma.product.findMany({
    where: search ? { OR: [{ barcode: { contains: search } }, { nameAr: { contains: search } }, { nameEn: { contains: search } }] } : undefined,
    include: { category: true, supplier: true },
    orderBy: { nameEn: 'asc' }
  }));
});
app.post('/products', async (req, res) => {
  if (Number(req.body.sellingPrice) < Number(req.body.purchasePrice) && req.body.approverRole !== 'ADMIN') return res.status(422).json({ error: 'Selling price below cost requires administrator approval' });
  res.status(201).json(await prisma.product.create({ data: req.body }));
});
app.put('/products/:id', async (req, res) => {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
  const sellingPrice = Number(req.body.sellingPrice ?? product.sellingPrice);
  const purchasePrice = Number(req.body.purchasePrice ?? product.purchasePrice);
  if (sellingPrice < purchasePrice && req.body.approverRole !== 'ADMIN') return res.status(422).json({ error: 'Selling price below cost requires administrator approval' });
  res.json(await prisma.product.update({ where: { id: product.id }, data: req.body }));
});
app.delete('/products/:id', async (req, res) => { requireAdmin(req.body.actorRole); res.json(await prisma.product.update({ where: { id: Number(req.params.id) }, data: { status: 'INACTIVE' } })); });

app.get('/inventory/movements', async (_req, res) => res.json(await prisma.inventoryMovement.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' } })));
app.post('/inventory/adjustments', async (req, res) => {
  requireAdmin(req.body.actorRole);
  const result = await prisma.$transaction(async tx => {
    const product = await tx.product.findUniqueOrThrow({ where: { id: req.body.productId } });
    const afterQty = product.quantity + Number(req.body.quantityDelta);
    if (afterQty < 0) throw new Error('Inventory cannot become negative');
    await tx.product.update({ where: { id: product.id }, data: { quantity: afterQty } });
    return tx.inventoryMovement.create({ data: { productId: product.id, type: req.body.type ?? 'ADJUSTMENT', quantity: Math.abs(Number(req.body.quantityDelta)), beforeQty: product.quantity, afterQty, reference: req.body.reference, notes: req.body.notes } });
  });
  res.status(201).json(result);
});

app.get('/purchases', async (_req, res) => res.json(await prisma.purchase.findMany({ include: { supplier: true, items: { include: { product: true } } }, orderBy: { date: 'desc' } })));
app.post('/purchases', async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const purchase = await tx.purchase.create({ data: { supplierId: req.body.supplierId, invoiceNumber: req.body.invoiceNumber, total: req.body.total } });
    for (const item of req.body.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      await tx.purchaseItem.create({ data: { purchaseId: purchase.id, productId: item.productId, quantity: item.quantity, purchasePrice: item.purchasePrice, total: item.quantity * item.purchasePrice } });
      await tx.product.update({ where: { id: item.productId }, data: { quantity: product.quantity + item.quantity, purchasePrice: item.purchasePrice } });
      await tx.inventoryMovement.create({ data: { productId: item.productId, type: 'PURCHASE', quantity: item.quantity, beforeQty: product.quantity, afterQty: product.quantity + item.quantity, reference: purchase.invoiceNumber } });
    }
    return purchase;
  });
  res.status(201).json(result);
});

app.get('/sales', async (req, res) => {
  const date = String(req.query.date ?? '');
  res.json(await prisma.sale.findMany({ where: date ? { date: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } } : undefined, include: { cashier: true, items: { include: { product: true } } }, orderBy: { date: 'desc' } }));
});
app.post('/sales', async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const receipt = receiptNumber();
    let total = 0, costOfGoods = 0;
    for (const item of req.body.items) { const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } }); if (product.quantity < item.quantity) throw new Error('Inventory cannot become negative'); total += Number(product.sellingPrice) * item.quantity; costOfGoods += Number(product.purchasePrice) * item.quantity; }
    const sale = await tx.sale.create({ data: { receiptNumber: receipt, cashierId: req.body.cashierId, subtotal: total, discount: req.body.discount ?? 0, total: total - (req.body.discount ?? 0), costOfGoods, paymentMethod: req.body.paymentMethod } });
    for (const item of req.body.items) { const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } }); await tx.saleItem.create({ data: { saleId: sale.id, productId: item.productId, quantity: item.quantity, unitPrice: product.sellingPrice, purchasePrice: product.purchasePrice, total: Number(product.sellingPrice) * item.quantity } }); await tx.product.update({ where: { id: item.productId }, data: { quantity: product.quantity - item.quantity } }); await tx.inventoryMovement.create({ data: { productId: item.productId, type: 'SALE', quantity: item.quantity, beforeQty: product.quantity, afterQty: product.quantity - item.quantity, reference: receipt } }); }
    return sale;
  });
  res.status(201).json(result);
});

app.get('/expenses', async (_req, res) => res.json(await prisma.expense.findMany({ orderBy: { date: 'desc' } })));
app.post('/expenses', async (req, res) => res.status(201).json(await prisma.expense.create({ data: { category: req.body.category, amount: req.body.amount, note: req.body.note, date: req.body.date ? new Date(req.body.date) : undefined } })));
app.put('/expenses/:id', async (req, res) => res.json(await prisma.expense.update({ where: { id: Number(req.params.id) }, data: req.body })));
app.delete('/expenses/:id', async (req, res) => { requireAdmin(req.body.actorRole); await prisma.expense.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); });

app.get('/dashboard', async (_req, res) => {
  const [products, suppliers, expenses, sales, purchases] = await Promise.all([prisma.product.findMany(), prisma.supplier.count(), prisma.expense.findMany(), prisma.sale.findMany(), prisma.purchase.findMany()]);
  const revenue = sales.reduce((s, sale) => s + asNumber(sale.total), 0);
  const grossProfit = sales.reduce((s, sale) => s + asNumber(sale.total) - asNumber(sale.costOfGoods), 0);
  const expenseTotal = expenses.reduce((s, e) => s + asNumber(e.amount), 0);
  res.json({ revenue, grossProfit, netProfit: grossProfit - expenseTotal, inventoryValue: products.reduce((s, p) => s + asNumber(p.purchasePrice) * p.quantity, 0), productCount: products.length, supplierCount: suppliers, expenses: expenseTotal, lowInventoryCount: products.filter(p => p.quantity <= p.minimumQuantity).length, supplierPurchaseValue: purchases.reduce((s, p) => s + asNumber(p.total), 0) });
});
app.get('/reports/financial', async (_req, res) => {
  const [sales, expenses] = await Promise.all([prisma.sale.findMany(), prisma.expense.findMany()]);
  const revenue = sales.reduce((s, sale) => s + asNumber(sale.total), 0);
  const grossProfit = sales.reduce((s, sale) => s + asNumber(sale.total) - asNumber(sale.costOfGoods), 0);
  const expenseTotal = expenses.reduce((s, e) => s + asNumber(e.amount), 0);
  res.json({ revenue, grossProfit, expenses: expenseTotal, netProfit: grossProfit - expenseTotal, margin: revenue ? grossProfit / revenue * 100 : 0 });
});
app.get('/reports/inventory', async (_req, res) => {
  const products = await prisma.product.findMany({ include: { category: true, supplier: true } });
  res.json({ products, lowStock: products.filter(p => p.quantity <= p.minimumQuantity && p.quantity > 0), outOfStock: products.filter(p => p.quantity === 0), inventoryValue: products.reduce((s, p) => s + asNumber(p.purchasePrice) * p.quantity, 0) });
});
app.get('/reports/products', async (_req, res) => {
  const items = await prisma.saleItem.groupBy({ by: ['productId'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } } });
  res.json(items);
});

app.get('/settings', async (_req, res) => res.json(await prisma.setting.findMany()));
app.put('/settings/:key', async (req, res) => { requireAdmin(req.body.actorRole); res.json(await prisma.setting.upsert({ where: { key: req.params.key }, create: { key: req.params.key, value: req.body.value }, update: { value: req.body.value } })); });
app.post('/admin/users', async (req, res) => {
  requireAdmin(req.body.actorRole);
  const { password, ...user } = req.body.user;
  res.status(201).json(await prisma.user.create({ data: { ...user, passwordHash: bcrypt.hashSync(password, 12) } }));
});
app.put('/admin/users/:id/status', async (req, res) => { requireAdmin(req.body.actorRole); res.json(await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } })); });

app.post('/backup', async (req, res) => {
  requireAdmin(req.body.actorRole);
  const backup = { createdAt: new Date().toISOString(), categories: await prisma.category.findMany(), suppliers: await prisma.supplier.findMany(), products: await prisma.product.findMany(), users: await prisma.user.findMany(), expenses: await prisma.expense.findMany(), settings: await prisma.setting.findMany(), purchases: await prisma.purchase.findMany({ include: { items: true } }), sales: await prisma.sale.findMany({ include: { items: true } }), movements: await prisma.inventoryMovement.findMany() };
  const folder = req.body.folder ?? 'backups';
  await fs.mkdir(folder, { recursive: true });
  const file = path.join(folder, `kms-backup-${backup.createdAt.replace(/[-:.TZ]/g, '')}.json`);
  await fs.writeFile(file, JSON.stringify(backup, null, 2));
  res.status(201).json({ file, backup });
});
app.post('/restore/validate', async (req, res) => res.json({ valid: Boolean(req.body.backup?.createdAt && req.body.backup?.products && req.body.backup?.settings) }));
