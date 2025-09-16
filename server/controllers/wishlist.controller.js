import { Wishlist } from '../models/Wishlist.js';

export async function getWishlist(req, res) {
  const wl = await Wishlist.findOne({ userId: req.user._id }) || await Wishlist.create({ userId: req.user._id, items: [] });
  res.json(wl.items.map(x => ({ id: x._id, productId: x.productId, createdAt: x.createdAt })));
}

export async function addToWishlist(req, res) {
  const productId = req.params.productId;
  let wl = await Wishlist.findOne({ userId: req.user._id });
  if (!wl) wl = await Wishlist.create({ userId: req.user._id, items: [] });
  if (!wl.items.find(x => String(x.productId) === String(productId))) {
    wl.items.push({ productId });
    await wl.save();
  }
  res.json({ success: true });
}

export async function removeFromWishlist(req, res) {
  const productId = req.params.productId;
  const wl = await Wishlist.findOne({ userId: req.user._id });
  if (!wl) return res.json({ success: true });
  wl.items = wl.items.filter(x => String(x.productId) !== String(productId));
  await wl.save();
  res.json({ success: true });
}
