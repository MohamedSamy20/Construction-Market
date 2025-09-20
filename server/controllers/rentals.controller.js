import mongoose from 'mongoose';
import { Rental } from '../models/Rental.js';
import { RentalMessage } from '../models/RentalMessage.js';
import { Notification } from '../models/Notification.js';
import { body, validationResult } from 'express-validator';

export async function listMine(req, res) {
  const items = await Rental.find({ customerId: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
}

export const validateCreateRental = [
  body('productId').optional().isString(),
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

// Admin: list all rentals (any status)
export async function listAll(req, res) {
  const items = await Rental.find({}).sort({ createdAt: -1 }).limit(500);
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
    productId: body.productId || undefined,
    productName: body.productName || undefined,
    customerId: req.user._id,
    startDate: start,
    endDate: end,
    rentalDays: days,
    dailyRate: body.dailyRate,
    totalAmount: total,
    status: 'pending',
    currency: body.currency || 'SAR',
    imageUrl: body.imageUrl || undefined,
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
  const r = await Rental.findOneAndUpdate(
    { _id: req.params.id, customerId: req.user._id },
    {
      ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
      ...(body.endDate ? { endDate: new Date(body.endDate) } : {}),
      ...(typeof body.dailyRate !== 'undefined' ? { dailyRate: Number(body.dailyRate) } : {}),
      ...(typeof body.securityDeposit !== 'undefined' ? { securityDeposit: Number(body.securityDeposit) } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.productId ? { productId: body.productId } : { productId: undefined }),
      ...(body.productName ? { productName: body.productName } : {}),
      ...(body.specialInstructions ? { specialInstructions: body.specialInstructions } : {}),
      ...(body.usageNotes ? { usageNotes: body.usageNotes } : {}),
      ...(typeof body.requiresDelivery !== 'undefined' ? { requiresDelivery: !!body.requiresDelivery } : {}),
      ...(typeof body.deliveryFee !== 'undefined' ? { deliveryFee: Number(body.deliveryFee) } : {}),
      ...(typeof body.requiresPickup !== 'undefined' ? { requiresPickup: !!body.requiresPickup } : {}),
      ...(typeof body.pickupFee !== 'undefined' ? { pickupFee: Number(body.pickupFee) } : {}),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      ...(typeof body.rentalDays !== 'undefined' ? { rentalDays: Number(body.rentalDays) } : {}),
      ...(typeof body.totalAmount !== 'undefined' ? { totalAmount: Number(body.totalAmount) } : {}),
    },
    { new: true }
  );
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true });
}

export async function remove(req, res) {
  const r = await Rental.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true });
}

// Admin moderation endpoints
export async function adminApprove(req, res) {
  const r = await Rental.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  );
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  return res.json({ success: true });
}

export async function adminDecline(req, res) {
  const r = await Rental.findByIdAndUpdate(
    req.params.id,
    { status: 'declined' },
    { new: true }
  );
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  return res.json({ success: true });
}

export async function adminRemove(req, res) {
  const r = await Rental.findByIdAndDelete(req.params.id);
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
  try {
    const r = await Rental.findById(rentalId).select('customerId').lean();
    if (r && String(req.user?._id) !== String(r.customerId)) {
      // Sender is not the customer -> notify the customer
      await Notification.create({
        userId: r.customerId,
        type: 'chat.message',
        title: 'Rental chat',
        message: String(message || ''),
        data: { conversationId: rentalId, kind: 'rental' },
      });
    }
  } catch {}
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
  try {
    const r = await Rental.findById(req.params.id).select('customerId').lean();
    if (r && String(req.user?._id) !== String(r.customerId)) {
      await Notification.create({
        userId: r.customerId,
        type: 'chat.message',
        title: 'Rental chat',
        message: String(message || ''),
        data: { conversationId: req.params.id, kind: 'rental' },
      });
    }
  } catch {}
  res.json({ success: true });
}

// Notifications (basic counts)
export async function vendorMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({});
  res.json({ count });
}

export async function vendorRecentMessages(req, res) {
  // Note: Rentals schema does not include vendorId; we return latest per rental globally
  const msgs = await RentalMessage.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.set('Cache-Control','no-store');
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

export async function customerMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({ fromUserId: req.user._id });
  res.json({ count });
}

export async function customerRecentMessages(req, res) {
  // Include rentals owned by the customer AND rentals where the customer authored any message
  const rentals = await Rental.find({ customerId: req.user._id }).select('_id').lean();
  const ownedIds = rentals.map(r => r._id);
  const authoredIds = await RentalMessage.distinct('rentalId', { fromUserId: req.user._id });
  const allIds = Array.from(new Set([ ...ownedIds.map(String), ...authoredIds.map(String) ])).map(id => new mongoose.Types.ObjectId(id));
  if (allIds.length === 0) return res.json([]);
  const msgs = await RentalMessage.aggregate([
    { $match: { rentalId: { $in: allIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

// Recent rentals where current user authored messages (works for vendor/technician/any role)
export async function myRecentMessages(req, res) {
  const authoredIds = await RentalMessage.distinct('rentalId', { fromUserId: req.user._id });
  if (!authoredIds || authoredIds.length === 0) return res.json([]);
  const ids = authoredIds.map(id => new mongoose.Types.ObjectId(String(id)));
  const msgs = await RentalMessage.aggregate([
    { $match: { rentalId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

// Recent rentals where current user AND at least one worker/technician both participated
export async function myRecentTechMessages(req, res) {
  try {
    // Gather rentalIds the current user participated in
    const authoredIds = await RentalMessage.distinct('rentalId', { fromUserId: req.user._id });
    if (!authoredIds || authoredIds.length === 0) return res.json([]);

    // For each rental, collect unique participant userIds
    const ids = authoredIds.map(id => new mongoose.Types.ObjectId(String(id)));
    const participants = await RentalMessage.aggregate([
      { $match: { rentalId: { $in: ids } } },
      { $group: { _id: "$rentalId", users: { $addToSet: "$fromUserId" } } },
    ]);

    // Fetch roles of all users involved once
    const allUserIds = Array.from(new Set(participants.flatMap(p => (p.users || []).map(u => String(u)))));
    const users = await (await import('../models/User.js')).User.find({ _id: { $in: allUserIds } }).select('_id role').lean();
    const roleMap = new Map(users.map(u => [String(u._id), String(u.role || '')]));

    // Filter rentalIds where there exists a worker/technician besides current user
    const techRentalIds = participants
      .filter(p => {
        const list = (p.users || []).map(u => String(u));
        if (!list.includes(String(req.user._id))) return false;
        return list.some(uid => uid !== String(req.user._id) && ['Worker','Technician','worker','technician'].includes(String(roleMap.get(uid) || '')));
      })
      .map(p => p._id);

    if (techRentalIds.length === 0) return res.json([]);

    // Return latest message per filtered rentalId
    const msgs = await RentalMessage.aggregate([
      { $match: { rentalId: { $in: techRentalIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
      { $sort: { at: -1 } },
      { $limit: 20 }
    ]);
    res.set('Cache-Control','no-store');
    res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
  } catch (e) {
    return res.json([]);
  }
}
