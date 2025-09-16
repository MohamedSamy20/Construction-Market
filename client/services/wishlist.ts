import { api } from '@/lib/api';

export type WishlistItem = {
  id: number;
  productId: number;
  productName: string;
  createdAt: string;
};

export async function getWishlist() {
  return api.get<WishlistItem[]>('/api/Wishlist', { auth: true });
}

export async function addToWishlist(productId: number) {
  return api.post<void>(`/api/Wishlist/${productId}`, undefined, { auth: true });
}

export async function removeFromWishlist(productId: number) {
  // Fallback to native fetch if api.delete is not available
  try {
    // @ts-ignore
    if (typeof api.delete === 'function') {
      // @ts-ignore
      return api.delete<void>(`/api/Wishlist/${productId}`, { auth: true });
    }
  } catch {}
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`/api/Wishlist/${productId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
  return { ok: true } as any;
}
