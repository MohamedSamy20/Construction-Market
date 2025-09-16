import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';

export async function createConversation(req, res) {
  const { serviceRequestId, technicianId } = req.body || {};
  const vendorId = req.user._id;
  let c = await ChatConversation.findOne({ serviceRequestId, vendorId, technicianId });
  if (!c) c = await ChatConversation.create({ serviceRequestId, vendorId, technicianId });
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const c = await ChatConversation.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId) });
}

export async function getConversationByKeys(req, res) {
  const { serviceRequestId, technicianId } = req.query;
  const c = await ChatConversation.findOne({ serviceRequestId: Number(serviceRequestId), technicianId });
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ id: c._id });
}

export async function listMessages(req, res) {
  const messages = await ChatMessage.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({ id: m._id, from: String(m.fromUserId), text: m.text, createdAt: m.createdAt })));
}

export async function sendMessage(req, res) {
  const { text } = req.body || {};
  const msg = await ChatMessage.create({ conversationId: req.params.conversationId, fromUserId: req.user._id, text });
  res.status(201).json({ id: msg._id });
}

export async function listMine(req, res) {
  const convs = await ChatConversation.find({ $or: [{ vendorId: req.user._id }, { technicianId: req.user._id }] }).sort({ updatedAt: -1 });
  res.json(convs.map(c => ({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId), createdAt: c.createdAt })));
}

export async function getByService(req, res) {
  const c = await ChatConversation.findOne({ serviceRequestId: Number(req.params.serviceRequestId) });
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, serviceRequestId: c.serviceRequestId });
}
