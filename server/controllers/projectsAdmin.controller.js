import { Project } from '../models/Project.js';
import { Bid } from '../models/Bid.js';

export async function listPending(req, res) {
  const items = await Project.find({ status: { $in: ['Draft', 'Published'] } }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}

export async function approve(req, res) {
  const id = req.params.id;
  const state = (req.query.state || 'Published');
  const p = await Project.findByIdAndUpdate(id, { status: state }, { new: true });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true });
}

export async function reject(req, res) {
  const id = req.params.id;
  const p = await Project.findByIdAndUpdate(id, { status: 'Cancelled' }, { new: true });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true });
}

export async function getById(req, res) {
  const p = await Project.findById(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json(p);
}

export async function listBids(req, res) {
  const items = await Bid.find({ projectId: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}
