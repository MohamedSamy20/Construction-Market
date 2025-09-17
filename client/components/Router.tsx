"use client";

import { useState, useEffect } from "react";
import { routes } from "./routes";
import { getCart as apiGetCart, addItem as apiAddItem, updateItemQuantity as apiUpdateItemQuantity, removeItem as apiRemoveItem, clearCart as apiClearCart } from "@/services/cart";
import Homepage from "../pages/Homepage";
import { useTranslation } from "../hooks/useTranslation";
import { getProfile } from "@/services/auth";
import { toastInfo } from "../utils/alerts";
import { getWishlist as apiGetWishlist, addToWishlist as apiAddToWishlist, removeFromWishlist as apiRemoveFromWishlist } from "@/services/wishlist";
import { getProductById } from "@/services/products";

export type UserRole = "customer" | "vendor" | "worker" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  isVerified?: boolean;
}

// Shared cart item type for front-only testing
export type CartItem = {
  id: string;
  name: string;
  price: number;
  brand?: string;
  originalPrice?: number;
  image?: string;
  partNumber?: string;
  quantity: number;
  inStock?: boolean;
  maxQuantity?: number;
};

// Wishlist item type for front-only testing
export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  brand?: string;
  originalPrice?: number;
  image?: string;
  partNumber?: string;
  inStock?: boolean;
};

export interface RouteContext {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  // Simple back navigation support
  prevPage: string | null;
  goBack: () => void;
  selectedProduct?: any;
  setSelectedProduct: (product: any) => void;
  searchFilters: SearchFilters | null;
  setSearchFilters: (filters: SearchFilters | null) => void;
  returnTo: string | null;
  setReturnTo: (page: string | null) => void;
  // Cart state/actions
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  // Wishlist state/actions
  wishlistItems: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
}

export interface SearchFilters {
  term: string;
  carType?: string;
  model?: string;
  partCategory?: string; // engine | tires | electrical | tools
  categoryId?: number; // backend category filter
}

export default function Router() {
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        return url.searchParams.get("page") || "home";
      } catch {
        return "home";
      }
    }
    return "home";
  });
  const [user, setUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(
    null
  );
  const [prevPage, setPrevPage] = useState<string | null>(null);
  // Keep an internal navigation history stack of visited pages
  const [history, setHistory] = useState<string[]>([]);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  // Auth check states
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [verificationRecheckedAt, setVerificationRecheckedAt] = useState<number>(0);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Initialize wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const addToCart = (item: CartItem) => {
    // Optimistic update
    setCartItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx !== -1) {
        const copy = [...prev];
        const maxQ = item.maxQuantity ?? 99;
        copy[idx] = { ...copy[idx], quantity: Math.min(maxQ, copy[idx].quantity + item.quantity) };
        return copy;
      }
      return [...prev, item];
    });
    // Sync with backend (guest or logged-in)
    (async () => {
      try {
        const r = await apiAddItem({ id: item.id, quantity: item.quantity, price: item.price });
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> itemsResp.map((it:any) => {
            const id = String(it.id);
            const prevItem = prev.find(p => p.id === id);
            return {
              id,
              name: it.name ?? prevItem?.name ?? item.name,
              price: Number(it.price ?? prevItem?.price ?? item.price ?? 0),
              brand: it.brand ?? prevItem?.brand,
              image: it.image || prevItem?.image || item.image,
              quantity: Number(it.quantity ?? prevItem?.quantity ?? item.quantity ?? 1),
            } as CartItem;
          }));
        }
      } catch {}
    })();
  };

  const updateCartQty = (id: string, qty: number) => {
    setCartItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)));
    (async () => {
      try {
        const r = await apiUpdateItemQuantity(id, Math.max(1, qty));
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> itemsResp.map((it:any) => {
            const pid = String(it.id);
            const prevItem = prev.find(p => p.id === pid);
            return {
              id: pid,
              name: it.name ?? prevItem?.name,
              price: Number(it.price ?? prevItem?.price ?? 0),
              brand: it.brand ?? prevItem?.brand,
              image: it.image || prevItem?.image,
              quantity: Number(it.quantity ?? prevItem?.quantity ?? 1),
            } as CartItem;
          }));
        }
      } catch {}
    })();
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((p) => p.id !== id));
    (async () => {
      try {
        const r = await apiRemoveItem(id);
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> itemsResp.map((it:any) => {
            const pid = String(it.id);
            const prevItem = prev.find(p => p.id === pid);
            return {
              id: pid,
              name: it.name ?? prevItem?.name,
              price: Number(it.price ?? prevItem?.price ?? 0),
              brand: it.brand ?? prevItem?.brand,
              image: it.image || prevItem?.image,
              quantity: Number(it.quantity ?? prevItem?.quantity ?? 1),
            } as CartItem;
          }));
        }
      } catch {}
    })();
  };

  const clearCart = () => {
    setCartItems([]);
    (async () => { try { await apiClearCart(); } catch {} })();
  };

  // Always load cart from backend (works for guests via cookie and authenticated users)
  useEffect(() => {
    (async () => {
      try {
        const r = await apiGetCart();
        if (r.ok && r.data && Array.isArray(r.data.items)) {
          const baseItems = r.data.items.map((it:any) => ({
            id: String(it.id),
            name: it.name,
            price: Number(it.price||0),
            brand: it.brand,
            image: it.image,
            quantity: Number(it.quantity||1)
          })) as CartItem[];
          // Enrich items missing image/name from product service
          const enriched = await Promise.all(baseItems.map(async (ci) => {
            if (ci.image && ci.name) return ci;
            try {
              const p = await getProductById(Number(ci.id));
              if (p.ok && p.data) {
                const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : [];
                const image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl;
                const name = (p as any).data?.nameAr || (p as any).data?.nameEn || ci.name;
                const price = Number((p as any).data?.price ?? ci.price ?? 0);
                return { ...ci, image: ci.image || image, name: ci.name || name, price } as CartItem;
              }
            } catch {}
            return ci;
          }));
          setCartItems(enriched);
        }
      } catch {}
    })();
  }, [user?.id]);

  // Wishlist: server-backed (requires auth) with enrichment (image/name/price)
  useEffect(() => {
    (async () => {
      if (!user) { setWishlistItems([]); return; }
      try {
        const r = await apiGetWishlist();
        if (r.ok && Array.isArray(r.data)) {
          const raw = r.data as any[];
          const enriched = await Promise.all(raw.map(async (w) => {
            const pid = Number((w as any).productId ?? (w as any).id);
            let image: string | undefined;
            let price: number | undefined;
            let name: string | undefined = (w as any).productName;
            try {
              if (Number.isFinite(pid)) {
                const p = await getProductById(pid);
                if (p.ok && p.data) {
                  const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : [];
                  image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl;
                  price = Number((p.data as any).price ?? 0);
                  if (!name) name = (p as any).data?.nameAr || (p as any).data?.nameEn || undefined;
                }
              }
            } catch {}
            return {
              id: String(pid),
              name: name || String(pid),
              price: price ?? 0,
              image,
              inStock: true,
              brand: undefined,
              originalPrice: undefined,
              partNumber: undefined,
            } as WishlistItem;
          }));
          setWishlistItems(enriched);
        } else setWishlistItems([]);
      } catch { setWishlistItems([]); }
    })();
  }, [user?.id]);

  const addToWishlist = async (item: WishlistItem) => {
    if (!user) {
      setReturnTo(currentPage);
      setCurrentPage('login');
      return;
    }
    try {
      await apiAddToWishlist(Number(item.id));
      const r = await apiGetWishlist();
      if (r.ok && Array.isArray(r.data)) {
        // trigger enrichment through effect by updating user id dep; or enrich inline
        const raw = r.data as any[];
        const enriched = await Promise.all(raw.map(async (w) => {
          const pid = Number((w as any).productId ?? (w as any).id);
          let image: string | undefined;
          let price: number | undefined;
          let name: string | undefined = (w as any).productName;
          try { if (Number.isFinite(pid)) { const p = await getProductById(pid); if (p.ok && p.data) { const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : []; image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl; price = Number((p.data as any).price ?? 0); if (!name) name = (p as any).data?.nameAr || (p as any).data?.nameEn || undefined; } } } catch {}
          return { id: String(pid), name: name || String(pid), price: price ?? 0, image, inStock: true } as WishlistItem;
        }));
        setWishlistItems(enriched);
      }
    } catch {}
  };

  const removeFromWishlist = async (id: string) => {
    if (!user) return;
    try {
      await apiRemoveFromWishlist(Number(id));
      const r = await apiGetWishlist();
      if (r.ok && Array.isArray(r.data)) {
        const raw = r.data as any[];
        const enriched = await Promise.all(raw.map(async (w) => {
          const pid = Number((w as any).productId ?? (w as any).id);
          let image: string | undefined;
          let price: number | undefined;
          let name: string | undefined = (w as any).productName;
          try { if (Number.isFinite(pid)) { const p = await getProductById(pid); if (p.ok && p.data) { const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : []; image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl; price = Number((p.data as any).price ?? 0); if (!name) name = (p as any).data?.nameAr || (p as any).data?.nameEn || undefined; } } } catch {}
          return { id: String(pid), name: name || String(pid), price: price ?? 0, image, inStock: true } as WishlistItem;
        }));
        setWishlistItems(enriched);
      }
    } catch {}
  };

  const isInWishlist = (id: string) => {
    return wishlistItems.some((item: any) => String(item.productId ?? item.id) === String(id));
  };

  // Navigation wrapper: push current page to history, update prevPage, then navigate
  const navigate = (page: string) => {
    // Pre-navigation guard: block unverified vendors from vendor routes
    try {
      const targetRoute = routes[page as keyof typeof routes];
      const wantsVendor = !!(targetRoute && targetRoute.allowedRoles && targetRoute.allowedRoles.includes('vendor'));
      if (wantsVendor && user && user.role === 'vendor' && user.isVerified === false) {
        const isAr = typeof window !== 'undefined' && (document?.documentElement?.dir === 'rtl');
        toastInfo(isAr ? 'انتظر موافقة الادمن' : 'Please wait for admin approval', isAr);
        return; // Do NOT navigate
      }
    } catch {}
    setHistory((h) => [...h, currentPage]);
    setPrevPage(currentPage);
    setCurrentPage(page);
  };

  const context: RouteContext = {
    currentPage,
    setCurrentPage: navigate,
    user,
    setUser,
    prevPage,
    goBack: () => {
      setHistory((h) => {
        if (h.length > 0) {
          const newHistory = h.slice(0, -1);
          const target = h[h.length - 1];
          setCurrentPage(target);
          const newPrev = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
          setPrevPage(newPrev);
          return newHistory;
        }
        // No history; fallback to prevPage if available, else stay on current page
        if (prevPage) {
          setCurrentPage(prevPage);
          setPrevPage(null);
        }
        return h;
      });
    },
    selectedProduct,
    setSelectedProduct,
    searchFilters,
    setSearchFilters,
    returnTo,
    setReturnTo,
    cartItems,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  };

  const currentRoute = routes[currentPage as keyof typeof routes];
  const CurrentPageComponent = currentRoute?.component || Homepage;

  const { locale } = useTranslation();
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Scroll to top on page change (ensure start at top, not footer)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual" as any;
        }
      } catch {}

      // Scroll instantly to top now and on next tick to avoid layout race
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }, 0);
    }
  }, [currentPage]);

  // No prevPage persistence in localStorage; keep in-memory only

  // Mark as mounted to avoid SSR/CSR mismatch on URL-dependent initial state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mark session check complete immediately; rely on JWT + getProfile below
  useEffect(() => {
    setSessionChecked(true);
  }, []);

  // Try to fetch profile from backend using cookies (no dependency on localStorage token)
  useEffect(() => {
    (async () => {
      if (!sessionChecked) return;
      try {
        const r = await getProfile();
        if (r.ok && r.data) {
          const roleMap: Record<string, UserRole> = { Admin: 'admin', Merchant: 'vendor', Technician: 'worker', Customer: 'customer', Worker: 'worker' };
          const arr = ((r.data as any).roles || []) as string[];
          const firstRole = Array.isArray(arr) && arr.length > 0 ? arr[0] : (r.data as any).role;
          const first = (r.data as any).firstName || '';
          const mid = (r.data as any).middleName || '';
          const last = (r.data as any).lastName || '';
          const name = (r.data as any).name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim();
          const mapped: User = {
            id: String((r.data as any).id || ''),
            name: String(name || ''),
            email: String((r.data as any).email || ''),
            role: roleMap[String(firstRole || '')] || 'customer',
            phone: (r.data as any).phoneNumber || (r.data as any).phone,
            firstName: first || undefined,
            middleName: mid || undefined,
            lastName: last || undefined,
            isVerified: Boolean((r.data as any).isVerified),
          };
          setUser(mapped);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [sessionChecked]);

  // Do not persist session in localStorage; rely on JWT token storage in auth.ts only

  // Keep current page in URL (?page=...) so it persists across locale switches
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (currentPage) {
          url.searchParams.set("page", currentPage);
        } else {
          url.searchParams.delete("page");
        }
        // Clean up page-specific params so they don't leak into other pages
        const needsServiceId = currentPage === 'technician-service-details';
        const needsProjectId = currentPage === 'technician-project-details';
        if (!needsServiceId) url.searchParams.delete('serviceId');
        if (!needsProjectId) url.searchParams.delete('projectId');
        window.history.replaceState({}, "", url.toString());
      } catch {
        // no-op
      }
    }
  }, [currentPage]);

  // Auth/role guard: enforce access to protected routes
  useEffect(() => {
    // Avoid running guard until we've checked for a persisted session
    if (!sessionChecked) return;
    // Also wait until we attempted profile fetch (cookie-based)
    if (!authChecked) return;
    // Special-case redirect: technicians should see services instead of public projects
    if (user && user.role === 'worker' && currentPage === 'projects') {
      setCurrentPage('technician-services');
      return;
    }
    const route = routes[currentPage as keyof typeof routes];
    if (!route) return;
    const needsAuth = !!route.requiresAuth;
    const allowed = (route.allowedRoles as any) as (UserRole[] | undefined);

    // If route needs auth and after auth check we still have no user -> redirect to login
    if (needsAuth && !user) {
      // Save intended page and redirect to login
      setReturnTo(currentPage);
      setCurrentPage("login");
      return;
    }
    if (needsAuth && user && allowed && allowed.length > 0) {
      if (!allowed.includes(user.role)) {
        // Not allowed; send to home
        setCurrentPage("home");
        return;
      }
      // If vendor/worker routes but account is not verified, block and inform
      const protectedVendor = allowed.includes('vendor' as any) && user.role === 'vendor';
      const protectedWorker = allowed.includes('worker' as any) && user.role === 'worker';
      if ((protectedVendor || protectedWorker) && user.isVerified === false) {
        // Before blocking, re-check profile once to pick up latest approval state
        const now = Date.now();
        const recentlyChecked = now - verificationRecheckedAt < 1500; // 1.5s throttle
        if (!recentlyChecked) {
          (async () => {
            try {
              const r = await getProfile();
              if (r.ok && r.data) {
                const roleMap: Record<string, UserRole> = { Admin: 'admin', Merchant: 'vendor', Technician: 'worker', Customer: 'customer', Worker: 'worker' };
                const arr = ((r.data as any).roles || []) as string[];
                const firstRole = Array.isArray(arr) && arr.length > 0 ? arr[0] : (r.data as any).role;
                const first = (r.data as any).firstName || '';
                const mid = (r.data as any).middleName || '';
                const last = (r.data as any).lastName || '';
                const name = (r.data as any).name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim();
                const refreshed: User = {
                  id: String((r.data as any).id || ''),
                  name: String(name || ''),
                  email: String((r.data as any).email || ''),
                  role: roleMap[String(firstRole || '')] || 'customer',
                  phone: (r.data as any).phoneNumber || (r.data as any).phone,
                  firstName: first || undefined,
                  middleName: mid || undefined,
                  lastName: last || undefined,
                  isVerified: Boolean((r.data as any).isVerified),
                };
                setUser(refreshed);
              }
            } catch {}
            setVerificationRecheckedAt(Date.now());
          })();
        } else {
          const isAr = typeof window !== 'undefined' && (document?.documentElement?.dir === 'rtl');
          toastInfo(
            isAr
              ? 'انتظر موافقة الادمن'
              : 'Please wait for admin approval',
            isAr
          );
          setCurrentPage('home');
        }
      }
    }
  }, [currentPage, user, sessionChecked]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background" dir={dir} suppressHydrationWarning>
      <CurrentPageComponent {...context} />
    </div>
  );
}

export { routes };
