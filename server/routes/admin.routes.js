import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { adminListPending as servicesPending, adminApprove as servicesApprove, adminReject as servicesReject } from '../controllers/services.controller.js';

import { adminListPendingProducts, adminApproveProduct, adminRejectProduct } from '../controllers/products.controller.js';
import { adminListPendingMerchants, adminApproveMerchant, adminSuspendMerchant } from '../controllers/adminMerchants.controller.js';
import { adminListUsers, adminSetUserStatus, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetUserById } from '../controllers/adminUsers.controller.js';


import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Rental } from '../models/Rental.js';
import { Project } from '../models/Project.js';
import { Service } from '../models/Service.js';
import { AdminOption } from '../models/AdminOption.js';
import bcrypt from 'bcryptjs';


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


// Users management
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const { role, status, q } = req.query || {};
    const filter = {};
    if (role) {
      const r = String(role);
      filter.role = r;
    }
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'pending') filter.isVerified = false;
      if (s === 'active') { filter.isActive = true; filter.isVerified = true; }
      if (s === 'suspended') filter.isActive = false;
      if (s === 'banned') filter.isActive = false; // simple mapping
    }
    if (q) {
      const text = String(q).trim();
      if (text) {
        filter.$or = [
          { name: new RegExp(text, 'i') },
          { email: new RegExp(text, 'i') },
          { companyName: new RegExp(text, 'i') },
        ];
      }
    }
    const rows = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000);
    const items = rows.map((u) => ({
      id: String(u._id),
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '),
      email: u.email || null,
      phoneNumber: u.phoneNumber || null,
      roles: [u.role].filter(Boolean),
      isActive: !!u.isActive,
      isVerified: !!u.isVerified,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      companyName: u.companyName || null,
      city: u.city || null,
      country: u.country || null,
    }));
    return res.json({ success: true, items });
  } catch (err) {
    console.warn('[admin] users list error:', err?.message || err);
    return res.json({ success: true, items: [] });
  }
});

router.post('/users/:id/status', ...adminOnly, async (req, res) => {
  try {
    const { status } = req.body || {};
    const updates = {};
    const s = String(status || '').toLowerCase();
    if (s === 'active') { updates.isActive = true; updates.isVerified = true; }
    else if (s === 'pending') { updates.isVerified = false; }
    else if (s === 'suspended' || s === 'banned') { updates.isActive = false; }
    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.warn('[admin] set status error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.post('/users', ...adminOnly, async (req, res) => {
  try {
    const payload = req.body || {};
    const email = String(payload.email || '').toLowerCase();
    const password = String(payload.password || '');
    if (!email || !password) return res.status(400).json({ success: false, message: 'email and password are required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const created = await User.create({
      email,
      password: hash,
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
      name: [payload.firstName, payload.lastName].filter(Boolean).join(' ') || payload.name,
      phoneNumber: payload.phoneNumber,
      companyName: payload.companyName,
      city: payload.city,
      country: payload.country,
      role: payload.role || 'User',
      isActive: true,
      isVerified: true,
    });
    return res.status(201).json({ success: true, id: String(created._id) });
  } catch (err) {
    console.warn('[admin] create user error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

router.put('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const updates = { ...(req.body || {}) };
    // Do not allow sensitive changes here
    ['password', 'email', 'createdAt', 'updatedAt', '_id'].forEach((k) => delete updates[k]);
    // Derive name if first/last provided
    if ((updates.firstName || updates.lastName) && !updates.name) {
      updates.name = [updates.firstName, updates.lastName].filter(Boolean).join(' ');
    }
    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.warn('[admin] update user error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

router.delete('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const it = await User.findByIdAndDelete(req.params.id);
    if (!it) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.warn('[admin] delete user error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

router.get('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ success: false, item: null, message: 'User not found' });
    const item = {
      id: String(u._id),
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '),
      email: u.email || null,
      phoneNumber: u.phoneNumber || null,
      roles: [u.role].filter(Boolean),
      isActive: !!u.isActive,
      isVerified: !!u.isVerified,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      companyName: u.companyName || null,
      city: u.city || null,
      country: u.country || null,
      firstName: u.firstName || null,
      middleName: u.middleName || null,
      lastName: u.lastName || null,
      taxNumber: u.taxNumber || null,
      profession: u.profession || null,
      iban: u.iban || null,
      registryStart: u.registryStart || null,
      registryEnd: u.registryEnd || null,
      address: u.address || null,
      buildingNumber: u.buildingNumber || null,
      streetName: u.streetName || null,
      postalCode: u.postalCode || null,
      profilePicture: u.profilePicture || null,
      documentPath: u.documentUrl || null,
      licenseImagePath: u.licenseImageUrl || null,
      rating: null,
      reviewCount: null,
    };
    return res.json({ success: true, item });
  } catch (err) {
    console.warn('[admin] get user error:', err?.message || err);
    return res.status(500).json({ success: false, item: null, message: 'Failed to fetch user' });
  }
});


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

