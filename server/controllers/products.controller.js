import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { body, validationResult } from 'express-validator';

const toSlug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export async function list(req, res) {
  const { page = 1, pageSize = 20 } = req.query;
  const q = { isApproved: true }; // public listing should show approved products only
  if (req.query.SearchTerm) {
    q.$or = [
      { nameEn: { $regex: req.query.SearchTerm, $options: 'i' } },
      { nameAr: { $regex: req.query.SearchTerm, $options: 'i' } },
    ];
  }
  if (req.query.CategoryId) q.categoryId = req.query.CategoryId;
  const sort = {};
  if (req.query.SortBy) sort[req.query.SortBy] = req.query.SortDescending === 'true' ? -1 : 1;
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, totalCount] = await Promise.all([
    Product.find(q).sort(sort).skip(skip).limit(Number(pageSize)),
    Product.countDocuments(q),
  ]);
  res.json({ items, totalCount, page: Number(page), pageSize: Number(pageSize) });
}

export async function featured(req, res) {
  const items = await Product.find({ isApproved: true }).sort({ createdAt: -1 }).limit(12);
  res.json(items);
}

export async function rentals(req, res) {
  const items = await Product.find({ isAvailableForRent: true, isApproved: true }).limit(50);
  res.json(items);
}

export async function getById(req, res) {
  const item = await Product.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json(item);
}

export async function getBySlug(req, res) {
  const item = await Product.findOne({ slug: req.params.slug });
  if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json(item);
}

export async function listMyProducts(req, res) {
  const items = await Product.find({ merchantId: req.user._id });
  res.json(items);
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  body.merchantId = req.user._id;
  // New policy: products created by non-admin require admin approval
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    body.isApproved = false;
    body.approvedAt = undefined;
  }
  if (!body.slug && (body.nameEn || body.nameAr)) {
    body.slug = toSlug(body.nameEn || body.nameAr);
  }
  if (body.categoryId) {
    try {
      const cat = await Category.findById(body.categoryId);
      if (!cat) return res.status(400).json({ success: false, message: 'Invalid categoryId' });
      body.categoryName = cat.nameEn;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId format' });
    }
  }
  const created = await Product.create(body);
  res.status(201).json(created);
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const updates = req.body || {};
  if (!updates.slug && (updates.nameEn || updates.nameAr)) {
    updates.slug = toSlug(updates.nameEn || updates.nameAr);
  }
  const updated = await Product.findOneAndUpdate({ _id: req.params.id, merchantId: req.user._id }, updates, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Product.findOneAndDelete({ _id: req.params.id, merchantId: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
}

export async function addImage(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  if (!payload.imageUrl || typeof payload.imageUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'imageUrl is required' });
  }
  const product = await Product.findOne({ _id: id, merchantId: req.user._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  product.images.push({
    imageUrl: payload.imageUrl,
    altText: payload.altText,
    isPrimary: !!payload.isPrimary,
    sortOrder: payload.sortOrder ?? 0,
  });
  await product.save();
  res.status(201).json({ success: true });
}

// Validators (module scope)
export const validateCreateProduct = [
  body('nameEn').isString().notEmpty(),
  body('nameAr').isString().notEmpty(),
  body('categoryId').isMongoId().withMessage('categoryId must be a valid Mongo ObjectId'),
  body('price').isNumeric(),
  body('stockQuantity').optional().isInt({ min: 0 }),
];

export const validateUpdateProduct = [
  body('nameEn').optional().isString().notEmpty(),
  body('nameAr').optional().isString().notEmpty(),
  body('categoryId').optional().isMongoId().withMessage('categoryId must be a valid Mongo ObjectId'),
  body('price').optional().isNumeric(),
  body('stockQuantity').optional().isInt({ min: 0 }),
];
