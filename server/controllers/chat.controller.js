import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Service } from '../models/Service.js';

export async function createConversation(req, res) {
  const { serviceRequestId } = req.body || {};
  let { technicianId } = req.body || {};
  if (!serviceRequestId) return res.status(400).json({ success: false, message: 'serviceRequestId is required' });

  // Determine initiator role and resolve vendor/technician IDs accordingly
  const role = String(req.user?.role || '');
  let vendorId = null;

  // Only vendor can initiate chat
  if (!/merchant/i.test(role)) {
    return res.status(403).json({ success: false, message: 'Only vendor can start conversations' });
  }
  vendorId = req.user._id;
  if (!technicianId) {
    return res.status(400).json({ success: false, message: 'technicianId is required when vendor starts the conversation' });
  }

  // Find or create
  let c = await ChatConversation.findOne({ serviceRequestId: String(serviceRequestId), vendorId, technicianId });
  if (!c) c = await ChatConversation.create({ serviceRequestId: String(serviceRequestId), vendorId, technicianId });
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const c = await ChatConversation.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId) });
}

export async function getConversationByKeys(req, res) {
  const { serviceRequestId, technicianId } = req.query;
  const c = await ChatConversation.findOne({ serviceRequestId: String(serviceRequestId), technicianId });
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ id: c._id });
}

export async function listMessages(req, res) {
  const messages = await ChatMessage.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({ id: m._id, from: String(m.fromUserId), text: m.text, createdAt: m.createdAt })));
}

export async function sendMessage(req, res) {
  const { text } = req.body || {};
  // Enforce "vendor sends first" rule
  const conv = await ChatConversation.findById(req.params.id);
  if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
  const messagesCount = await ChatMessage.countDocuments({ conversationId: req.params.id });
  const role = String(req.user?.role || '');
  const isVendor = /merchant/i.test(role);
  const isTech = /technician|worker/i.test(role);
  if (messagesCount === 0 && isTech) {
    return res.status(403).json({ success: false, message: 'Technician cannot send the first message. Vendor must initiate the conversation.' });
  }
  const msg = await ChatMessage.create({ conversationId: req.params.id, fromUserId: req.user._id, text });
  res.status(201).json({ id: msg._id });
}

export async function listMine(req, res) {
  const convs = await ChatConversation.find({ $or: [{ vendorId: req.user._id }, { technicianId: req.user._id }] }).sort({ updatedAt: -1 });
  res.json(convs.map(c => ({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId), createdAt: c.createdAt })));
}

export async function getByService(req, res) {
  const c = await ChatConversation.findOne({ serviceRequestId: String(req.params.serviceRequestId) });
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, serviceRequestId: c.serviceRequestId });
}
