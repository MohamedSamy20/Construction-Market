import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  items: { type: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, createdAt: { type: Date, default: Date.now } }], default: [] },
}, { timestamps: true });

export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
