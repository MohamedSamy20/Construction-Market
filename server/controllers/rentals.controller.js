import { Rental } from '../models/Rental.js';
import { RentalMessage } from '../models/RentalMessage.js';
import { body, validationResult } from 'express-validator';

export async function listMine(req, res) {
  const items = await Rental.find({ customerId: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
}

export const validateCreateRental = [
  body('productId').isString().notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('dailyRate').isNumeric(),
];

export const validateUpdateRental = [
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('dailyRate').optional().isNumeric(),
];

export const validateAdjustDays = [
  body('days').isInt({ min: 1 }),
];

export const validateRentalMessage = [
  body('message').isString().notEmpty(),
  body('name').optional().isString(),
  body('phone').optional().isString(),
];

export const validateRentalReply = [
  body('message').isString().notEmpty(),
  body('toEmail').optional().isEmail(),
];

export async function listPublic(req, res) {
  const items = await Rental.find({ status: { $in: ['pending', 'approved'] } }).sort({ createdAt: -1 }).limit(200);
  res.json(items);
}

export async function getById(req, res) {
  const r = await Rental.findById(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json(r);
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const total = days * Number(body.dailyRate || 0);
  const r = await Rental.create({
    productId: body.productId,
    productName: body.productName || undefined,
    customerId: req.user._id,
    startDate: start,
    endDate: end,
    rentalDays: days,
    dailyRate: body.dailyRate,
    totalAmount: total,
    status: 'pending',
  });
  res.status(201).json({ id: r._id });
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  if (body.startDate && body.endDate && body.dailyRate) {
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    body.rentalDays = days;
    body.totalAmount = days * Number(body.dailyRate || 0);
  }
  const r = await Rental.findOneAndUpdate({ _id: req.params.id, customerId: req.user._id }, body, { new: true });
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true });
}

export async function remove(req, res) {
  const r = await Rental.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true });
}

export async function adjustDays(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { days } = req.body || {};
  const r = await Rental.findOne({ _id: req.params.id, customerId: req.user._id });
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  r.rentalDays = Math.max(1, Number(days || 1));
  r.totalAmount = r.rentalDays * Number(r.dailyRate || 0);
  await r.save();
  res.json({ success: true });
}

// Messages
export async function sendMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const rentalId = req.params.id;
  const { name, phone, message } = req.body || {};
  await RentalMessage.create({ rentalId, name, phone, message, fromUserId: req.user?._id });
  res.json({ success: true });
}

export async function listMessages(req, res) {
  const messages = await RentalMessage.find({ rentalId: req.params.id }).sort({ createdAt: -1 }).limit(200);
  res.json(messages.map(m => ({ id: m._id, message: m.message, at: m.createdAt, from: m.fromUserId })));
}

export async function replyMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { message, toEmail } = req.body || {};
  await RentalMessage.create({ rentalId: req.params.id, message, toEmail, fromUserId: req.user?._id });
  res.json({ success: true });
}

// Notifications (basic counts)
export async function vendorMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({});
  res.json({ count });
}

export async function vendorRecentMessages(req, res) {
  const msgs = await RentalMessage.find({}).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.rentalId), projectId: null, message: m.message, at: m.createdAt, from: String(m.fromUserId || '') })));
}

export async function customerMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({ fromUserId: req.user._id });
  res.json({ count });
}

export async function customerRecentMessages(req, res) {
  const msgs = await RentalMessage.find({ fromUserId: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.rentalId), projectId: null, message: m.message, at: m.createdAt, from: String(m.fromUserId || '') })));
}
