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

// Analytics
router.get('/analytics/overview', ...adminOnly, (req, res) => res.json({
  success: true,
  stats: { totalUsers: 0, customers: 0, merchants: 0, technicians: 0, activeVendors: 0 },
  sales: { daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' },
  finance: { monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' },
}));

export default router;

