import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { performanceSummary, performanceSeries, customersSummary, customersSeries } from '../controllers/vendorAnalytics.controller.js';

const router = express.Router();

router.get('/performance/summary', protect, requireRoles('Merchant', 'Admin'), performanceSummary);
router.get('/performance/series', protect, requireRoles('Merchant', 'Admin'), performanceSeries);
router.get('/customers/summary', protect, requireRoles('Merchant', 'Admin'), customersSummary);
router.get('/customers/series', protect, requireRoles('Merchant', 'Admin'), customersSeries);

export default router;
