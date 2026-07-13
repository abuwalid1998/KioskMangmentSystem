import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { CartLine, checkout, expenses, products, profit } from './domain';
import './i18n';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function App() {
  const { t, i18n } = useTranslation();
  const [cart, setCart] = useState([] as CartLine[]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const rtl = i18n.language === 'ar';
  const inventoryValue = products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);
  const monthlyRevenue = 1860;
  const grossProfit = 620;
  const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - operatingExpenses;
  const filtered = products.filter(p => [p.barcode, p.nameAr, p.nameEn].some(v => v.toLowerCase().includes(query.toLowerCase())));
  const cartTotal = cart.reduce((s, l) => s + l.product.sellingPrice * l.quantity - l.discount, 0);
  const cartProfit = cart.reduce((s, l) => s + profit(l), 0);
  const alerts = products.filter(p => p.quantity <= p.minimumQuantity || p.sellingPrice < p.purchasePrice);
  const chartData = useMemo(() => ({ labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ label: t('todaySales'), data: [220, 310, 280, 390, 420, 370, 460], backgroundColor: '#0d6efd' }] }), [t]);

  function addProduct(productId: number) {
    const product = products.find(p => p.id === productId)!;
    setCart(current => current.some(l => l.product.id === productId) ? current.map(l => l.product.id === productId ? { ...l, quantity: l.quantity + 1 } : l) : [...current, { product, quantity: 1, discount: 0 }]);
  }

  function completeSale() {
    try { checkout(cart, 'CASH'); setCart([]); setMessage('Receipt printed and inventory updated.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout failed'); }
  }

  return <main dir={rtl ? 'rtl' : 'ltr'} className="min-vh-100 bg-light">
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3 sticky-top"><span className="navbar-brand fw-bold">{t('app')}</span><div className="ms-auto d-flex gap-2"><button className="btn btn-outline-light" onClick={() => i18n.changeLanguage(rtl ? 'en' : 'ar')}>{rtl ? 'English' : 'العربية'}</button><span className="badge text-bg-success align-self-center">Offline SQLite Ready</span></div></nav>
    <div className="container-fluid py-4"><div className="row g-4">
      <aside className="col-lg-2"><div className="list-group shadow-sm">{['dashboard','pos','products','inventory','suppliers','purchases','reports','users','settings','backup'].map(k => <a className="list-group-item list-group-item-action" href={`#${k}`} key={k}>{t(k)}</a>)}</div></aside>
      <section className="col-lg-10">
        <div id="dashboard" className="row g-3 mb-4">{[[t('todaySales'), 460], [t('todayProfit'), 154], [t('monthlyRevenue'), monthlyRevenue], [t('monthlyProfit'), grossProfit], [t('inventoryValue'), inventoryValue], [t('expenses'), operatingExpenses], [t('netProfit'), netProfit]].map(([label, value]) => <div className="col-md-3" key={label}><div className="card kpi"><div className="card-body"><small>{label}</small><h3>{currency.format(Number(value))}</h3></div></div></div>)}</div>
        <div className="row g-4 mb-4"><div className="col-lg-8"><div className="card"><div className="card-header">Revenue Trend</div><div className="card-body"><Bar data={chartData} /></div></div></div><div className="col-lg-4"><div className="card"><div className="card-header">Profit Trend</div><div className="card-body"><Line data={{...chartData, datasets: [{...chartData.datasets[0], label: 'Profit', data: [70,90,80,120,130,118,154], borderColor: '#198754', backgroundColor: '#198754'}]}} /></div></div></div></div>
        <div className="row g-4"><div className="col-xl-7" id="pos"><div className="card shadow-sm"><div className="card-header d-flex justify-content-between"><strong>{t('pos')}</strong><input className="form-control w-50" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} autoFocus /></div><div className="table-responsive"><table className="table table-hover mb-0"><thead><tr><th>{t('barcode')}</th><th>Name</th><th>Stock</th><th>Margin</th><th></th></tr></thead><tbody>{filtered.map(p => <tr key={p.id} className={p.quantity === 0 ? 'table-danger' : p.quantity <= p.minimumQuantity ? 'table-warning' : ''}><td>{p.barcode}</td><td>{rtl ? p.nameAr : p.nameEn}<small className="d-block text-muted">{p.category} • {p.supplier}</small></td><td>{p.quantity} {p.unit}</td><td>{Math.round(((p.sellingPrice-p.purchasePrice)/p.sellingPrice)*100)}%</td><td><button disabled={p.quantity <= 0} className="btn btn-sm btn-primary" onClick={() => addProduct(p.id)}>Add</button></td></tr>)}</tbody></table></div></div></div>
        <div className="col-xl-5"><div className="card shadow-sm"><div className="card-header"><strong>Receipt</strong></div><div className="card-body">{cart.map(l => <div className="d-flex justify-content-between border-bottom py-2" key={l.product.id}><span>{rtl ? l.product.nameAr : l.product.nameEn} × {l.quantity}</span><strong>{currency.format(l.product.sellingPrice * l.quantity)}</strong></div>)}<div className="mt-3"><p>Total: <strong>{currency.format(cartTotal)}</strong></p><p>Gross profit: <strong>{currency.format(cartProfit)}</strong></p><button className="btn btn-success btn-lg w-100" disabled={!cart.length} onClick={completeSale}>{t('checkout')}</button>{message && <div className="alert alert-info mt-3">{message}</div>}</div></div></div><div className="card mt-4"><div className="card-header">Alerts</div><ul className="list-group list-group-flush">{alerts.map(p => <li className="list-group-item" key={p.id}>{p.nameEn}: {p.quantity === 0 ? t('outOfStock') : p.quantity <= p.minimumQuantity ? t('lowStock') : t('negativeMargin')}</li>)}</ul></div></div></div>
      </section></div></div>
  </main>;
}
