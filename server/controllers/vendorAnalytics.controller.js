import { Order } from '../models/Order.js';
import { User } from '../models/User.js';

export async function performanceSummary(req, res) {
  const vendorId = req.user._id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonth, lastMonth] = await Promise.all([
    Order.aggregate([
      { $match: { vendorId } },
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { vendorId } },
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
  ]);

  const salesThisMonth = thisMonth[0]?.total || 0;
  const ordersThisMonth = thisMonth[0]?.count || 0;
  const salesLastMonth = lastMonth[0]?.total || 0;
  const avgOrderValue = ordersThisMonth ? salesThisMonth / ordersThisMonth : 0;

  // Basic status distribution
  const statusAgg = await Order.aggregate([
    { $match: { vendorId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));

  res.json({
    salesThisMonth,
    salesLastMonth,
    ordersThisMonth,
    avgOrderValue,
    ordersByStatus: {
      pending: byStatus['pending'] || 0,
      shipped: byStatus['shipped'] || 0,
      delivered: byStatus['delivered'] || 0,
      processing: byStatus['processing'] || 0,
      cancelled: byStatus['cancelled'] || 0,
    },
  });
}

export async function performanceSeries(req, res) {
  const vendorId = req.user._id;
  const months = Math.max(1, Math.min(24, Number(req.query.months || 6)));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const agg = await Order.aggregate([
    { $match: { vendorId } },
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  const series = agg.map(r => ({ key: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`, sales: r.sales, orders: r.orders }));
  res.json(series);
}

export async function customersSummary(req, res) {
  const vendorId = req.user._id;
  // For simplicity, compute unique customers from orders
  const totals = await Order.aggregate([
    { $match: { vendorId } },
    { $group: { _id: '$customerId', orders: { $sum: 1 } } },
  ]);
  const totalCustomers = totals.length;
  const ordersSum = totals.reduce((s, r) => s + r.orders, 0);
  const avgOrdersPerCustomer = totalCustomers ? ordersSum / totalCustomers : 0;

  res.json({
    totalCustomers,
    newCustomersThisMonth: 0,
    returningCustomersThisMonth: 0,
    repeatRate: 0,
    avgOrdersPerCustomer,
  });
}

export async function customersSeries(req, res) {
  // Placeholder series
  res.json([]);
}
