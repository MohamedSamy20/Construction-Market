import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { adminListPending as servicesPending, adminApprove as servicesApprove, adminReject as servicesReject } from '../controllers/services.controller.js';
import { adminListPendingProducts, adminApproveProduct, adminRejectProduct } from '../controllers/products.controller.js';
import { adminListPendingMerchants, adminApproveMerchant, adminSuspendMerchant } from '../controllers/adminMerchants.controller.js';
import { adminListUsers, adminSetUserStatus, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetUserById } from '../controllers/adminUsers.controller.js';


const router = express.Router();
const adminOnly = [protect, requireRoles('Admin')];

// Services moderation
router.get('/services/pending', ...adminOnly, servicesPending);
router.post('/services/:id/approve', ...adminOnly, servicesApprove);
router.post('/services/:id/reject', ...adminOnly, servicesReject);

// Products moderation & management
router.get('/products/pending', ...adminOnly, adminListPendingProducts);
router.post('/products/:id/approve', ...adminOnly, adminApproveProduct);
router.post('/products/:id/reject', ...adminOnly, adminRejectProduct);
// The below endpoints can be implemented later with full admin product management
router.post('/products', ...adminOnly, (req, res) => res.status(201).json({ success: true }));
router.put('/products/:id', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/products/:id/discount', ...adminOnly, (req, res) => res.json({ success: true }));

// Merchants moderation
router.get('/merchants/pending', ...adminOnly, adminListPendingMerchants);
router.post('/merchants/:id/approve', ...adminOnly, adminApproveMerchant);
router.post('/merchants/:id/suspend', ...adminOnly, adminSuspendMerchant);

// Users management (real implementation)
router.get('/users', ...adminOnly, adminListUsers);
router.post('/users/:id/status', ...adminOnly, adminSetUserStatus);
router.post('/users', ...adminOnly, adminCreateUser);
router.put('/users/:id', ...adminOnly, adminUpdateUser);
router.delete('/users/:id', ...adminOnly, adminDeleteUser);
router.get('/users/:id', ...adminOnly, adminGetUserById);


// Analytics (computed from DB)
router.get('/analytics/overview', ...adminOnly, async (req, res) => {
  try {
    // Users breakdown
    const [
      totalUsers,
      customers,
      merchants,
      technicians,
      activeVendors,
    ] = await Promise.all([
      User.countDocuments({}),
      // Treat 'Customer' or generic 'User' as customers
      User.countDocuments({ role: { $in: ['Customer', 'User'] } }),
      User.countDocuments({ role: 'Merchant' }),
      User.countDocuments({ role: { $in: ['Technician', 'Worker'] } }),
      User.countDocuments({ role: 'Merchant', isActive: true, isVerified: true }),
    ]);

    // Sales aggregates
    const now = new Date();
    const startOf = (unit) => {
      const d = new Date(now);
      if (unit === 'day') { d.setHours(0,0,0,0); }
      else if (unit === 'week') {
        const day = d.getDay(); // 0 Sun .. 6 Sat
        const diff = (day + 6) % 7; // start Monday
        d.setDate(d.getDate() - diff);
        d.setHours(0,0,0,0);
      } else if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
      else if (unit === 'year') { d.setMonth(0,1); d.setHours(0,0,0,0); }
      return d;
    };

    const [ordersDay, ordersWeek, ordersMonth, ordersYear, ordersPending] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startOf('day') }, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOf('week') }, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOf('month') }, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOf('year') }, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['pending','processing'] }, archived: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } },
      ]),
    ]);

    const take = (arr) => (Array.isArray(arr) && arr[0]?.total) ? Number(arr[0].total) : 0;
    const daily = take(ordersDay);
    const weekly = take(ordersWeek);
    const monthly = take(ordersMonth);
    const yearly = take(ordersYear);
    const pendingPayouts = take(ordersPending);

    const currency = 'SAR';
    const monthlyRevenue = monthly;
    // Platform commission base (can be overridden by AdminOption later)
    const platformCommission = Math.round(monthlyRevenue * 0.10);

    // Inventory (Products)
    const [invSum, lowStockAlerts] = await Promise.all([
      Product.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ['$stockQuantity', 0] } } } },
      ]),
      Product.countDocuments({ stockQuantity: { $gt: 0, $lte: 5 } }),
    ]);
    const totalInStockItems = (Array.isArray(invSum) && invSum[0]?.total) ? Number(invSum[0].total) : 0;

    // Commission rates from AdminOptions
    const [cProd, cProjMerch, cServTech] = await Promise.all([
      AdminOption.findOne({ key: 'commission_products' }),
      AdminOption.findOne({ key: 'commission_projects_merchants' }),
      AdminOption.findOne({ key: 'commission_services_technicians' }),
    ]);
    const parseRate = (doc) => {
      try { return Number(JSON.parse(String(doc?.value ?? '0')) || 0); } catch { return 0; }
    };
    const rateProducts = parseRate(cProd);
    const rateProjectsMerchants = parseRate(cProjMerch);
    const rateServicesTechnicians = parseRate(cServTech);

    // Monthly commission amounts (very simple model based on monthlyRevenue)
    const commissions = {
      products: Math.round(monthlyRevenue * (rateProducts / 100)),
      projectsMerchants: Math.round(monthlyRevenue * (rateProjectsMerchants / 100)),
      servicesTechnicians: Math.round(monthlyRevenue * (rateServicesTechnicians / 100)),
      currency,
      rates: {
        products: rateProducts,
        projectsMerchants: rateProjectsMerchants,
        servicesTechnicians: rateServicesTechnicians,
      },
    };

    // Counts
    const [ordersMonthCnt, rentalsMonthCnt, projectsAcceptedCnt, servicesAcceptedCnt] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOf('month') }, archived: { $ne: true } }),
      Rental.countDocuments({ createdAt: { $gte: startOf('month') } }),
      Project.countDocuments({ status: { $in: ['Awarded', 'InProgress', 'Completed'] }, updatedAt: { $gte: startOf('month') } }),
      Service.countDocuments({ isApproved: true, updatedAt: { $gte: startOf('month') } }),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, customers, merchants, technicians, activeVendors },
      sales: { daily, weekly, monthly, yearly, currency },
      finance: { monthlyRevenue, platformCommission, pendingVendorPayouts: pendingPayouts, currency },
      inventory: { totalInStockItems, lowStockAlerts },
      commissions,
      counts: { ordersMonth: ordersMonthCnt, rentalsMonth: rentalsMonthCnt, projectsAccepted: projectsAcceptedCnt, servicesAccepted: servicesAcceptedCnt },
    });
  } catch (err) {
    console.warn('[admin] analytics overview error:', err?.message || err);
    res.json({
      success: true,
      stats: { totalUsers: 0, customers: 0, merchants: 0, technicians: 0, activeVendors: 0 },
      sales: { daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' },
      finance: { monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' },
    });
  }
});

export default router;

