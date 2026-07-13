import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
export const app = express();
app.use(express.json());

function requireAdmin(role?: Role) { if (role !== 'ADMIN') throw new Error('Administrator permission required'); }

app.post('/auth/login', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { username: req.body.username } });
  if (!user || user.status !== 'ACTIVE' || !bcrypt.compareSync(req.body.password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ id: user.id, fullName: user.fullName, role: user.role, preferredLanguage: user.preferredLanguage });
});

app.get('/products', async (_req, res) => res.json(await prisma.product.findMany({ include: { category: true, supplier: true } })));
app.post('/products', async (req, res) => {
  if (Number(req.body.sellingPrice) < Number(req.body.purchasePrice) && req.body.approverRole !== 'ADMIN') return res.status(422).json({ error: 'Selling price below cost requires administrator approval' });
  res.status(201).json(await prisma.product.create({ data: req.body }));
});
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
app.post('/sales', async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const receiptNumber = `R-${Date.now()}`;
    let total = 0, costOfGoods = 0;
    for (const item of req.body.items) { const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } }); if (product.quantity < item.quantity) throw new Error('Inventory cannot become negative'); total += Number(product.sellingPrice) * item.quantity; costOfGoods += Number(product.purchasePrice) * item.quantity; }
    const sale = await tx.sale.create({ data: { receiptNumber, cashierId: req.body.cashierId, subtotal: total, discount: req.body.discount ?? 0, total: total - (req.body.discount ?? 0), costOfGoods, paymentMethod: req.body.paymentMethod } });
    for (const item of req.body.items) { const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } }); await tx.saleItem.create({ data: { saleId: sale.id, productId: item.productId, quantity: item.quantity, unitPrice: product.sellingPrice, purchasePrice: product.purchasePrice, total: Number(product.sellingPrice) * item.quantity } }); await tx.product.update({ where: { id: item.productId }, data: { quantity: product.quantity - item.quantity } }); await tx.inventoryMovement.create({ data: { productId: item.productId, type: 'SALE', quantity: item.quantity, beforeQty: product.quantity, afterQty: product.quantity - item.quantity, reference: receiptNumber } }); }
    return sale;
  });
  res.status(201).json(result);
});
app.get('/dashboard', async (_req, res) => {
  const [products, suppliers, expenses] = await Promise.all([prisma.product.findMany(), prisma.supplier.count(), prisma.expense.findMany()]);
  res.json({ inventoryValue: products.reduce((s, p) => s + Number(p.purchasePrice) * p.quantity, 0), productCount: products.length, supplierCount: suppliers, expenses: expenses.reduce((s, e) => s + Number(e.amount), 0), lowInventoryCount: products.filter(p => p.quantity <= p.minimumQuantity).length });
});
app.post('/admin/users', async (req, res) => {
  requireAdmin(req.body.actorRole);
  const { password, ...user } = req.body.user;
  res.status(201).json(await prisma.user.create({ data: { ...user, passwordHash: bcrypt.hashSync(password, 12) } }));
});
