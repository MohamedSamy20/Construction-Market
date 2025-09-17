import { useEffect, useMemo, useState } from 'react';
import { Search, Grid, List, Tag, Eye, Heart, ShoppingCart, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useTranslation } from '../hooks/useTranslation';
import type { RouteContext } from '../components/routerTypes';
import { toastError } from '../utils/alerts';
import { getAvailableForRent, type ProductDto } from '@/services/products';
import { listPublicRentals, type RentalDto } from '@/services/rentals';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toastSuccess, toastInfo } from '../utils/alerts';
import { addFavorite, removeFavorite, isFavorite } from '../lib/favorites';
// Vendor rentals are managed in the vendor dashboard; not shown on public rentals page

interface RentalsProps extends Partial<RouteContext> {}

export default function Rentals({ setCurrentPage, ...rest }: RentalsProps) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';

  const [rentals, setRentals] = useState<ProductDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Local tick to force re-render when favorites (localStorage) change for guests
  const [favVersion, setFavVersion] = useState(0);
  const [publicRentals, setPublicRentals] = useState<RentalDto[]>([]);
  // Optimistic wishlist UI overrides per product id
  const [wishOverrides, setWishOverrides] = useState<Record<string, boolean>>({});
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<RentalDto | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantMsg, setApplicantMsg] = useState('');
  // Read-only page (no add/edit in this view)
  const [isAddDialogOpen] = useState(false);
  const [editingRental] = useState<any>(null);

  const isVendor = !!(rest as any)?.user && (rest as any)?.user?.role === 'vendor';
  const isLoggedIn = !!(rest as any)?.user;

  const isWishlisted = (id: string) => {
    const key = String(id);
    if (key in wishOverrides) return !!wishOverrides[key];
    if (isLoggedIn && typeof (rest as any)?.isInWishlist === 'function') return !!(rest as any).isInWishlist(key);
    return isFavorite(key);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await getAvailableForRent();
        if (!cancelled) {
          setRentals(ok && Array.isArray(data) ? (data as ProductDto[]) : []);
        }
      } catch {
        if (!cancelled) { setRentals([]); toastError(locale==='ar'? 'فشل تحميل عناصر التأجير':'Failed to load rentals', locale==='ar'); }
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  // Listen to favorites updates (guest mode via localStorage)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === 'favorites_v1') setFavVersion((v)=> v + 1); };
    const onFav = () => setFavVersion((v)=> v + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      window.addEventListener('favorites_updated', onFav as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('favorites_updated', onFav as any);
      }
    };
  }, []);

  // Load rentals from database (public)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listPublicRentals();
        if (!cancelled) setPublicRentals(Array.isArray(res.data) ? (res.data as RentalDto[]) : []);
      } catch {
        if (!cancelled) setPublicRentals([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  const filtered = useMemo(() => {
    if (!searchTerm) return rentals;
    const q = searchTerm.toLowerCase();
    return rentals.filter((r:any) => {
      const nm = String((r as any).nameAr || (r as any).nameEn || '').toLowerCase();
      return nm.includes(q);
    });
  }, [rentals, searchTerm]);

  
  const onApplyClick = (r: RentalDto) => {
    if (!isLoggedIn) {
      toastInfo(locale==='ar'? 'يرجى تسجيل الدخول للتقديم على عقد التأجير' : 'Please sign in to apply for this rental', locale==='ar');
      setCurrentPage && setCurrentPage('login');
      return;
    }
    setSelectedRental(r);
    setApplicantName(''); setApplicantPhone(''); setApplicantMsg('');
    setApplyOpen(true);
  };
  const submitApplication = () => {
    if (!applicantName || !applicantPhone) {
      toastError(locale==='ar'? 'يرجى إدخال الاسم ورقم الجوال' : 'Please enter your name and phone');
      return;
    }
    // Placeholder: store locally; backend endpoint can be added later
    try { if (typeof window!=='undefined') {
      const key = 'rental_applications';
      const raw = window.localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({
        rentalId: selectedRental?.id,
        productId: selectedRental?.productId,
        at: new Date().toISOString(),
        name: applicantName,
        phone: applicantPhone,
        message: applicantMsg,
      });
      window.localStorage.setItem(key, JSON.stringify(arr));
    }} catch {}
    toastSuccess(locale==='ar'? 'تم إرسال طلبك بنجاح' : 'Your application has been sent', locale==='ar');
    setApplyOpen(false);
  };

  const mapRentalToProduct = (p: ProductDto) => ({
    id: String(p.id),
    name: (p as any).nameAr || (p as any).nameEn || '',
    price: Number(p.rentPricePerDay ?? 0),
    originalPrice: Number((p as any)?.price ?? p.rentPricePerDay ?? 0),
    image: (p as any)?.images?.[0]?.imageUrl || (p as any)?.imageUrl || '',
    brand: (p as any)?.brand || { ar: 'عام', en: 'Generic' },
    inStock: true,
    stockCount: 99,
    partNumber: (p as any)?.sku || `R-${p.id}`,
  });

  // Map a RentalDto (contract) to a cart item shape
  const mapContractToCartItem = (r: RentalDto, imgSrc: string) => ({
    id: String(r.productId),
    name: (r as any).productName || `#${r.productId}`,
    price: Number(r.dailyRate || 0),
    image: imgSrc,
    quantity: 1,
    inStock: true,
    partNumber: `R-${r.id}`,
    originalPrice: Number(r.totalAmount || 0),
    rental: {
      id: r.id,
      productId: r.productId,
      startDate: r.startDate,
      endDate: r.endDate,
      rentalDays: r.rentalDays,
      dailyRate: r.dailyRate,
      totalAmount: r.totalAmount,
    }
  });

  const RentalCard = ({ r }: { r: ProductDto }) => (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="relative mb-4">
          <ImageWithFallback src={(r as any)?.images?.[0]?.imageUrl || (r as any)?.imageUrl} alt={String((r as any).nameAr || (r as any).nameEn || '')} className="w-full h-48 object-cover rounded-lg" />
          {(r as any).isAvailableForRent && (
            <Badge className="absolute top-2 right-2 bg-primary">{locale==='ar' ? 'نشط' : 'Active'}</Badge>
          )}
          {!isVendor && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-2 left-2 h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 ${isWishlisted(String(r.id)) ? 'text-red-500 border-red-200 ring-red-200' : 'text-gray-700'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const mapped = mapRentalToProduct(r);
                const already = isWishlisted(String(mapped.id));
                const useCtx = isLoggedIn && typeof (rest as any)?.isInWishlist === 'function' && !!(rest as any)?.addToWishlist && !!(rest as any)?.removeFromWishlist;
                if (!already) {
                  if (useCtx) {
                    (rest as any).addToWishlist!({
                      id: String(mapped.id),
                      name: mapped.name,
                      price: mapped.price,
                      brand: (mapped as any).brand,
                      originalPrice: mapped.originalPrice,
                      image: mapped.image,
                      inStock: mapped.inStock,
                    });
                  } else {
                    addFavorite({ id: String(mapped.id), name: mapped.name as any, price: mapped.price, brand: (mapped as any).brand as any, image: mapped.image });
                    try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                  }
                  setWishOverrides(prev => ({ ...prev, [String(mapped.id)]: true }));
                  setFavVersion(v => v + 1);
                  toastSuccess(locale==='ar'? 'تمت الإضافة إلى المفضلة':'Added to favorites', locale==='ar');
                } else {
                  if (useCtx) {
                    (rest as any).removeFromWishlist!(String(mapped.id));
                  } else {
                    removeFavorite(String(mapped.id));
                    try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                  }
                  setWishOverrides(prev => ({ ...prev, [String(mapped.id)]: false }));
                  setFavVersion(v => v + 1);
                  toastInfo(locale==='ar'? 'تمت الإزالة من المفضلة':'Removed from favorites', locale==='ar');
                }
              }}
              title={locale==='ar'?'مفضلة':'Favorite'}
            >
              <Heart className={`h-5 w-5 ${isWishlisted(String(r.id)) ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-lg">{String((r as any).nameAr || (r as any).nameEn || '')}</h3>
            <p className="text-sm text-muted-foreground">{locale==='ar'?'منتج للتأجير':'Rental product'}</p>
          </div>
          {isVendor && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{locale==='ar'?'خاص بالتاجر':'Vendor-owned'}</Badge>
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Tag className="w-4 h-4" /> {locale==='ar' ? 'متاح للتأجير' : 'Available for rent'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-primary font-semibold">
            {currency} {(Number(r.rentPricePerDay||0)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} / {locale==='ar'?'يوم':'day'}
          </span>
          {!isVendor && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    (rest as any)?.setSelectedProduct && (rest as any).setSelectedProduct(mapRentalToProduct(r));
                  } catch {}
                  if (setCurrentPage) setCurrentPage('rental-details');
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Eye className="w-4 h-4 mr-1" /> {locale==='ar' ? 'التفاصيل' : 'Details'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const mapped = mapRentalToProduct(r);
                  (rest as any)?.addToCart && (rest as any).addToCart({
                    id: String(mapped.id),
                    name: mapped.name,
                    price: mapped.price,
                    image: mapped.image,
                    quantity: 1,
                    inStock: true,
                    partNumber: mapped.partNumber,
                    originalPrice: mapped.originalPrice,
                  });
                  toastSuccess(locale==='ar'? 'تمت الإضافة إلى السلة':'Added to cart', locale==='ar');
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-1" /> {locale==='ar' ? 'أضف للسلة' : 'Add'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const mapped = mapRentalToProduct(r);
                  (rest as any)?.addToCart && (rest as any).addToCart({
                    id: String(mapped.id),
                    name: mapped.name,
                    price: mapped.price,
                    image: mapped.image,
                    quantity: 1,
                    inStock: true,
                    partNumber: mapped.partNumber,
                    originalPrice: mapped.originalPrice,
                  });
                  setCurrentPage && setCurrentPage('checkout');
                }}
                title={locale==='ar'?'اشتري الآن':'Buy now'}
              >
                <CreditCard className="w-4 h-4 mr-1" /> {locale==='ar' ? 'ادفع الآن' : 'Buy'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Add/Edit/Delete removed – backend-driven only

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'?'rtl':'ltr'}>
      <Header currentPage="rentals" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">{locale==='ar' ? 'التأجير' : 'Rentals'}</h1>
            <p className="text-muted-foreground">{locale==='ar' ? 'تصفح عناصر التأجير المتاحة' : 'Browse available rental items'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
              <Grid className="w-4 h-4 mr-1" /> {locale==='ar' ? 'شبكة' : 'Grid'}
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4 mr-1" /> {locale==='ar' ? 'قائمة' : 'List'}
            </Button>
            {/* Rentals are sourced from backend; vendor can manage via Products if needed */}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative max-w-xl">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={locale==='ar' ? 'ابحث في التأجير...' : 'Search rentals...'}
                value={searchTerm}
                onChange={(e)=> setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rentals from database */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{locale==='ar'? 'عقود التأجير' : 'Rental Contracts'}</h2>
              <span className="text-sm text-muted-foreground">{publicRentals.length}</span>
            </div>
            {publicRentals.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد عقود تأجير متاحة للعرض حالياً.' : 'No rental contracts to display yet.'}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {publicRentals.map((r) => {
                  const prod = rentals.find((p:any) => String(p.id) === String(r.productId));
                  const prodImg = (prod as any)?.images?.[0]?.imageUrl || (prod as any)?.imageUrl || '';
                  const imgSrc = (r as any).imageUrl || prodImg || '';
                  return (
                  <Card key={r.id} className="group hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="relative mb-4">
                        <ImageWithFallback src={imgSrc} alt={String((r as any).productName || '')} className="w-full h-48 object-cover rounded-lg bg-gray-100" />
                        <Badge className="absolute top-2 right-2 bg-primary">{locale==='ar' ? 'عقد' : 'Contract'}</Badge>
                        {!isVendor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 left-2 h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 ${isWishlisted(String(r.productId)) ? 'text-red-500 border-red-200 ring-red-200' : 'text-gray-700'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const favId = String(r.productId);
                              const already = isWishlisted(favId);
                              const useCtx = isLoggedIn && typeof (rest as any)?.isInWishlist === 'function' && !!(rest as any)?.addToWishlist && !!(rest as any)?.removeFromWishlist;
                              const favItem = { id: favId, name: (r as any).productName || `#${r.productId}`, price: Number(r.dailyRate||0), image: imgSrc } as any;
                              if (!already) {
                                if (useCtx) {
                                  (rest as any).addToWishlist!(favItem);
                                } else {
                                  addFavorite(favItem);
                                  try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                                }
                                setWishOverrides(prev => ({ ...prev, [favId]: true }));
                                setFavVersion(v => v + 1);
                                toastSuccess(locale==='ar'? 'تمت الإضافة إلى المفضلة':'Added to favorites', locale==='ar');
                              } else {
                                if (useCtx) {
                                  (rest as any).removeFromWishlist!(favId);
                                } else {
                                  removeFavorite(favId);
                                  try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                                }
                                setWishOverrides(prev => ({ ...prev, [favId]: false }));
                                setFavVersion(v => v + 1);
                                toastInfo(locale==='ar'? 'تمت الإزالة من المفضلة':'Removed from favorites', locale==='ar');
                              }
                            }}
                            title={locale==='ar'?'مفضلة':'Favorite'}
                          >
                            <Heart className={`h-5 w-5 ${isWishlisted(String(r.productId)) ? 'fill-current' : ''}`} />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-lg line-clamp-1">{(r as any).productName || `#${r.productId}`}</h3>
                          <p className="text-sm text-muted-foreground">
                            {locale==='ar' ? `من ${new Date(r.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(r.endDate).toLocaleDateString('ar-EG')}` : `From ${new Date(r.startDate).toLocaleDateString('en-US')} to ${new Date(r.endDate).toLocaleDateString('en-US')}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs">{locale==='ar'?'أيام':'Days'}</div>
                          <div className="font-medium">{r.rentalDays}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'?'سعر اليوم':'Daily'}</div>
                          <div className="font-medium">{currency} {Number(r.dailyRate||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'?'الإجمالي':'Total'}</div>
                          <div className="font-semibold text-primary">{currency} {Number(r.totalAmount||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={()=> {
                            try {
                              if (typeof window!== 'undefined') {
                                const toSave = { ...r, imageUrl: imgSrc };
                                localStorage.setItem('selected_rental', JSON.stringify(toSave));
                                const url = new URL(window.location.href);
                                url.searchParams.set('page', 'rental-contract');
                                url.searchParams.set('id', String(r.id));
                                window.history.replaceState({}, '', url.toString());
                              }
                            } catch {}
                            setCurrentPage && setCurrentPage('rental-contract');
                          }}
                        >
                          {locale==='ar'? 'تفاصيل' : 'Details'}
                        </Button>
                        {!isVendor && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const item = mapContractToCartItem(r, imgSrc);
                                (rest as any)?.addToCart && (rest as any).addToCart(item);
                                toastSuccess(locale==='ar'? 'تمت الإضافة إلى السلة':'Added to cart', locale==='ar');
                              }}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" /> {locale==='ar' ? 'أضف للسلة' : 'Add'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const item = mapContractToCartItem(r, imgSrc);
                                (rest as any)?.addToCart && (rest as any).addToCart(item);
                                setCurrentPage && setCurrentPage('checkout');
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-1" /> {locale==='ar' ? 'ادفع الآن' : 'Buy'}
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={()=> onApplyClick(r)}>
                          {locale==='ar'? 'تقديم' : 'Apply'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply Dialog */}
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{locale==='ar'? 'تقديم على عقد التأجير' : 'Apply for Rental'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{locale==='ar'? 'العقد' : 'Contract'}</Label>
                <div className="text-sm text-muted-foreground">{selectedRental ? ((selectedRental as any).productName || `#${selectedRental.productId}`) : '-'}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="applName">{locale==='ar'? 'الاسم' : 'Name'}</Label>
                  <Input id="applName" value={applicantName} onChange={(e)=> setApplicantName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="applPhone">{locale==='ar'? 'الجوال' : 'Phone'}</Label>
                  <Input id="applPhone" value={applicantPhone} onChange={(e)=> setApplicantPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="applMsg">{locale==='ar'? 'رسالتك' : 'Message'}</Label>
                <Textarea id="applMsg" rows={4} value={applicantMsg} onChange={(e)=> setApplicantMsg(e.target.value)} placeholder={locale==='ar'? 'اكتب تفاصيل إضافية...' : 'Add any details...'} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={()=> setApplyOpen(false)}>{locale==='ar'? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={submitApplication}>{locale==='ar'? 'إرسال الطلب' : 'Send application'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Public rentals list */}
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            {locale==='ar' ? 'لا توجد عناصر تأجير بعد.' : 'No rental items yet.'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filtered.map((r:any) => (
              <RentalCard key={r.id} r={r} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r:any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-16 overflow-hidden rounded-md border bg-gray-50">
                        <ImageWithFallback src={(r as any)?.images?.[0]?.imageUrl || (r as any)?.imageUrl} alt={String((r as any).nameAr || (r as any).nameEn || '')} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-semibold">{String((r as any).nameAr || (r as any).nameEn || '')}</div>
                        <div className="text-xs text-muted-foreground">{locale==='ar'?'متاح للتأجير':'Available for rent'}</div>
                      </div>
                    </div>
                    <div className="text-primary font-semibold">
                      {currency} {(Number(r.rentPricePerDay||0)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} / {locale==='ar'?'يوم':'day'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Edit dialog removed: rentals are displayed from backend */}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
