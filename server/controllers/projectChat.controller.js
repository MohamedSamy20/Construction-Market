import { ProjectConversation } from '../models/ProjectConversation.js';
import { ProjectMessage } from '../models/ProjectMessage.js';

export async function createConversation(req, res) {
  const { projectId, merchantId } = req.body || {};
  const customerId = req.user._id;
  let c = await ProjectConversation.findOne({ projectId, merchantId, customerId });
  if (!c) c = await ProjectConversation.create({ projectId, merchantId, customerId });
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const c = await ProjectConversation.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, projectId: String(c.projectId), customerId: String(c.customerId), merchantId: String(c.merchantId) });
}

export async function getConversationByKeys(req, res) {
  const { projectId, merchantId } = req.query || {};
  const c = await ProjectConversation.findOne({ projectId, merchantId });
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ id: c._id });
}

export async function listMessages(req, res) {
  const messages = await ProjectMessage.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({ id: m._id, from: String(m.fromUserId), text: m.text, createdAt: m.createdAt })));
}

export async function sendMessage(req, res) {
  const { text } = req.body || {};
  const msg = await ProjectMessage.create({ conversationId: req.params.conversationId, fromUserId: req.user._id, text });
  res.status(201).json({ id: msg._id });
}

export async function vendorMessageCount(req, res) {
  // Basic count of last messages addressed to vendor
  const count = await ProjectMessage.countDocuments({});
  res.json({ count });
}

export async function vendorRecentMessages(req, res) {
  const msgs = await ProjectMessage.find({}).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.conversationId), projectId: null, message: m.text, at: m.createdAt, from: String(m.fromUserId || '') })));
}

export async function customerMessageCount(req, res) {
  const count = await ProjectMessage.countDocuments({ fromUserId: req.user._id });
  res.json({ count });
}

export async function customerRecentMessages(req, res) {
  const msgs = await ProjectMessage.find({ fromUserId: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.conversationId), projectId: null, message: m.text, at: m.createdAt, from: String(m.fromUserId || '') })));
}
