import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getAvailableForRent, type ProductDto, getProductById } from '@/services/products';
import { listPublicRentals, type RentalDto } from '@/services/rentals';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function AdminRentalOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'not_rented' | 'rented'>('not_rented');
  const [query, setQuery] = useState('');
  const [available, setAvailable] = useState<ProductDto[]>([]);
  const [rented, setRented] = useState<RentalDto[]>([]);
  const [productMap, setProductMap] = useState<Record<string, ProductDto>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [a, r] = await Promise.all([getAvailableForRent(), listPublicRentals()]);
        if (!cancelled) {
          if (a.ok && Array.isArray(a.data)) setAvailable(a.data as ProductDto[]);
          if (r.ok && Array.isArray(r.data)) setRented(r.data as RentalDto[]);

          // Build a map of known products from available list
          const baseMap: Record<string, ProductDto> = {};
          if (a.ok && Array.isArray(a.data)) {
            for (const p of a.data as ProductDto[]) baseMap[p.id] = p;
          }
          // Determine missing productIds from rentals
          const missingIds = new Set<string>();
          if (r.ok && Array.isArray(r.data)) {
            for (const rent of r.data as RentalDto[]) {
              if (rent.productId && !baseMap[rent.productId]) missingIds.add(rent.productId);
            }
          }
          // Fetch missing product details in parallel (cap to 15 to avoid overload)
          const ids = Array.from(missingIds).slice(0, 15);
          if (ids.length) {
            const fetched = await Promise.all(ids.map(id => getProductById(id)));
            for (let i = 0; i < ids.length; i++) {
              const res = fetched[i];
              if (res && res.ok && res.data) baseMap[ids[i]] = res.data as ProductDto;
            }
          }
          setProductMap(baseMap);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (filter === 'not_rented') {
      let list = available;
      if (q) list = list.filter(p => (p.nameAr||p.nameEn||'').toLowerCase().includes(q) || (p.descriptionAr||p.descriptionEn||'').toLowerCase().includes(q));
      return { type: 'available' as const, items: list };
    } else {
      let list = rented;
      if (q) list = list.filter(r => (r.productName||'').toLowerCase().includes(q));
      return { type: 'rented' as const, items: list };
    }
  }, [available, rented, filter, query]);

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'خيارات التأجير' : 'Rental Options'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'عرض العناصر المتاحة للتأجير أو المؤجرة حالياً من قاعدة البيانات' : 'View items available for rent or currently rented from the database'}</p>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{locale==='ar' ? 'التأجير' : 'Rentals'}</CardTitle>
                <div className="flex gap-2">
                  <Button variant={filter==='not_rented' ? 'default' : 'outline'} onClick={() => setFilter('not_rented')}>{locale==='ar' ? 'متاحة للتأجير' : 'Not Rented'}</Button>
                  <Button variant={filter==='rented' ? 'default' : 'outline'} onClick={() => setFilter('rented')}>{locale==='ar' ? 'مؤجرة' : 'Rented'}</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input placeholder={locale==='ar' ? 'بحث...' : 'Search...'} value={query} onChange={(e)=>setQuery(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (<div key={i} className="h-32 rounded bg-gray-100 animate-pulse" />))}
              </div>
            ) : (
              <>
                {(filtered.items as any[]).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد عناصر.' : 'No items.'}</div>
                ) : filtered.type === 'available' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(filtered.items as ProductDto[]).map((p) => (
                      <Card key={p.id} className="overflow-hidden">
                        <div className="relative h-40 bg-gray-100">
                          <ImageWithFallback
                            src={(p.images?.find(i=>i.isPrimary)?.imageUrl) || p.images?.[0]?.imageUrl || ''}
                            alt={(p.nameEn || p.nameAr) || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="font-semibold text-base mb-1">{locale==='ar' ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr)}</div>
                          <div className="text-sm text-muted-foreground">#{p.id} · {locale==='ar' ? 'السعر اليومي' : 'Daily'}: {p.rentPricePerDay ?? '-'} · {locale==='ar' ? 'التاجر' : 'Merchant'}: {p.merchantName}</div>
                          <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الفئة' : 'Category'}: {p.categoryName}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(filtered.items as RentalDto[]).map((r) => (
                      <Card key={r.id} className="overflow-hidden">
                        <div className="relative h-40 bg-gray-100">
                          {/* Pull image from product map (fetched or available) */}
                          <ImageWithFallback
                            src={(productMap[r.productId]?.images?.find(i=>i.isPrimary)?.imageUrl) || (productMap[r.productId]?.images?.[0]?.imageUrl) || ''}
                            alt={r.productName || `#${r.productId}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="font-semibold text-base mb-1">{r.productName || productMap[r.productId]?.nameEn || productMap[r.productId]?.nameAr || `#${r.productId}`}</div>
                          <div className="text-sm text-muted-foreground">#{r.id} · {locale==='ar' ? 'من' : 'From'} {new Date(r.startDate).toLocaleDateString()} {locale==='ar' ? 'إلى' : 'to'} {new Date(r.endDate).toLocaleDateString()}</div>
                          <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الأيام' : 'Days'}: {r.rentalDays} · {locale==='ar' ? 'سعر اليوم' : 'Daily'}: {r.dailyRate} · {locale==='ar' ? 'الإجمالي' : 'Total'}: {r.totalAmount}</div>
                          {productMap[r.productId] && (
                            <div className="text-sm text-muted-foreground">{locale==='ar' ? 'التاجر' : 'Merchant'}: {productMap[r.productId].merchantName} · {locale==='ar' ? 'الفئة' : 'Category'}: {productMap[r.productId].categoryName}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
