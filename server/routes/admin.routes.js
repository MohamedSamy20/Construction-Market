import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { adminListPending as servicesPending, adminApprove as servicesApprove, adminReject as servicesReject } from '../controllers/services.controller.js';

const router = express.Router();
const adminOnly = [protect, requireRoles('Admin')];

// Services moderation
router.get('/services/pending', ...adminOnly, servicesPending);
router.post('/services/:id/approve', ...adminOnly, servicesApprove);
router.post('/services/:id/reject', ...adminOnly, servicesReject);

// Products moderation & management
router.get('/products/pending', ...adminOnly, (req, res) => res.json({ success: true, items: [] }));
router.post('/products/:id/approve', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/products/:id/reject', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/products', ...adminOnly, (req, res) => res.status(201).json({ success: true }));
router.put('/products/:id', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/products/:id/discount', ...adminOnly, (req, res) => res.json({ success: true }));

// Merchants moderation
router.get('/merchants/pending', ...adminOnly, (req, res) => res.json({ success: true, items: [] }));
router.post('/merchants/:id/approve', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/merchants/:id/suspend', ...adminOnly, (req, res) => res.json({ success: true }));

// Users management
router.get('/users', ...adminOnly, (req, res) => res.json({ success: true, items: [] }));
router.post('/users/:id/status', ...adminOnly, (req, res) => res.json({ success: true }));
router.post('/users', ...adminOnly, (req, res) => res.status(201).json({ success: true, id: 'new' }));
router.put('/users/:id', ...adminOnly, (req, res) => res.json({ success: true }));
router.delete('/users/:id', ...adminOnly, (req, res) => res.json({ success: true }));
router.get('/users/:id', ...adminOnly, (req, res) => res.json({ success: true, item: null }));

// Analytics
router.get('/analytics/overview', ...adminOnly, (req, res) => res.json({
  success: true,
  stats: { totalUsers: 0, customers: 0, merchants: 0, technicians: 0, activeVendors: 0 },
  sales: { daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' },
  finance: { monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' },
}));

export default router;
