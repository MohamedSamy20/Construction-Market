import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { listMine, listPublic, listAll, getById, create, update, remove, adjustDays, sendMessage, listMessages, replyMessage, vendorMessageCount, vendorRecentMessages, customerMessageCount, customerRecentMessages, validateCreateRental, validateUpdateRental, validateAdjustDays, validateRentalMessage, validateRentalReply, adminApprove, adminDecline, adminRemove } from '../controllers/rentals.controller.js';

const router = express.Router();

router.get('/mine', protect, listMine);
router.get('/public', listPublic);
router.get('/message-count', protect, vendorMessageCount);
router.get('/messages/recent', protect, vendorRecentMessages);
router.get('/customer/message-count', protect, customerMessageCount);
router.get('/customer/messages/recent', protect, customerRecentMessages);

// Admin pending must be before dynamic :id
router.get('/pending', protect, requireRoles('Admin'), listPublic);
router.get('/all', protect, requireRoles('Admin'), listAll);
router.post('/:id/approve', protect, requireRoles('Admin'), adminApprove);
router.post('/:id/decline', protect, requireRoles('Admin'), adminDecline);
router.delete('/:id/remove', protect, requireRoles('Admin'), adminRemove);

router.get('/:id', getById);
router.post('/', protect, validateCreateRental, create);
router.put('/:id', protect, validateUpdateRental, update);
router.delete('/:id', protect, remove);
router.post('/:id/adjust-days', protect, validateAdjustDays, adjustDays);
router.post('/:id/message', validateRentalMessage, sendMessage);
router.get('/:id/messages', protect, listMessages);
router.post('/:id/reply', protect, validateRentalReply, replyMessage);

export default router;
