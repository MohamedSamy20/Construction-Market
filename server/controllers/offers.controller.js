import { Offer } from '../models/Offer.js';
import { body, validationResult } from 'express-validator';

export const validateCreateOffer = [
  body('TargetType').isIn(['service', 'project']),
  body('Price').isNumeric(),
  body('Days').isInt({ min: 1 }),
];

export const validateUpdateOffer = [
  body('TargetType').optional().isIn(['service', 'project']),
  body('Price').optional().isNumeric(),
  body('Days').optional().isInt({ min: 1 }),
];

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const b = req.body || {};
  const created = await Offer.create({
    technicianId: req.user._id,
    targetType: b.TargetType,
    serviceId: b.ServiceId || undefined,
    projectId: b.ProjectId || undefined,
    price: b.Price,
    days: b.Days,
    message: b.Message || undefined,
  });
  res.status(201).json(created);
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const b = req.body || {};
  const updates = {
    targetType: b.TargetType,
    serviceId: b.ServiceId,
    projectId: b.ProjectId,
    price: b.Price,
    days: b.Days,
    message: b.Message,
  };
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
  const updated = await Offer.findOneAndUpdate({ _id: req.params.id, technicianId: req.user._id }, updates, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Offer.findOneAndDelete({ _id: req.params.id, technicianId: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json({ success: true });
}

export async function listByService(req, res) {
  const items = await Offer.find({ targetType: 'service', serviceId: req.params.serviceId }).sort({ createdAt: -1 });
  res.json(items);
}

export async function listByProject(req, res) {
  const items = await Offer.find({ targetType: 'project', projectId: req.params.projectId }).sort({ createdAt: -1 });
  res.json(items);
}

export async function updateStatus(req, res) {
  const { Status } = req.body || {};
  const allowed = ['accepted', 'rejected', 'pending'];
  if (!allowed.includes(Status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  const updated = await Offer.findByIdAndUpdate(req.params.id, { status: Status }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json(updated);
}

export async function listByTechnician(req, res) {
  const items = await Offer.find({ technicianId: req.params.id }).sort({ createdAt: -1 });
  res.json(items);
}
