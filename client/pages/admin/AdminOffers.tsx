import React, { useEffect, useState } from 'react';
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from '../../hooks/useTranslation';
import { getProducts, type ProductDto } from '@/services/products';
import { adminSetProductDiscount, adminUpdateProduct, approveProduct } from '@/services/admin';

export default function AdminOffers({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const currency = isAr ? 'ر.س' : 'SAR';

  const [items, setItems] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await getProducts({ page: 1, pageSize: 500 });
      const listAny = (r.data as any) || {};
      const raw = Array.isArray(listAny.items) ? listAny.items : (Array.isArray(listAny.Items) ? listAny.Items : []);
      const list = raw as ProductDto[];
      setItems(list);
      setError(null);
    } catch {
      setError(isAr ? 'تعذر جلب المنتجات' : 'Failed to fetch products');
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const setDiscount = async (p: ProductDto, newDiscount: number | null) => {
    try {
      setSavingId(p.id);
      const res = await adminSetProductDiscount(p.id, newDiscount);
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        // Fallback: full update via adminUpdateProduct if discount endpoint missing on server
        const payload: any = {
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          descriptionEn: p.descriptionEn ?? '',
          descriptionAr: p.descriptionAr ?? '',
          categoryId: p.categoryId,
          price: p.price,
          discountPrice: newDiscount,
          stockQuantity: p.stockQuantity,
          allowCustomDimensions: p.allowCustomDimensions,
          isAvailableForRent: p.isAvailableForRent,
          rentPricePerDay: p.rentPricePerDay ?? null,
          attributes: (p.attributes || []).map(a => ({ nameEn: a.nameEn, nameAr: a.nameAr, valueEn: a.valueEn, valueAr: a.valueAr })),
        };
        await adminUpdateProduct(p.id, payload);
        if (!p.isApproved) { try { await approveProduct(p.id); } catch {} }
      }
      await load();
    } finally { setSavingId(null); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isAr ? 'إدارة العروض' : 'Manage Offers'}</h1>
          <p className="text-muted-foreground">{isAr ? 'عيّن سعر الخصم لأي منتج ليظهر في صفحة العروض.' : 'Set discount price for any product to show it on Offers page.'}</p>
          <div className="mt-3">
            <Button variant={onlyOffers? 'default':'outline'} size="sm" onClick={()=>setOnlyOffers(o=>!o)}>
              {onlyOffers ? (isAr? 'عرض كل المنتجات' : 'Show All Products') : (isAr? 'إظهار التي عليها عروض فقط' : 'Show Only With Offers')}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card><CardContent className="p-6 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="p-6 text-red-600">{error}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {(onlyOffers ? items.filter(p => typeof p.discountPrice==='number' && (p.discountPrice as number) > 0 && (p.discountPrice as number) < p.price) : items).map((p) => {
              const discounted = typeof p.discountPrice === 'number' && p.discountPrice! > 0 && p.discountPrice! < p.price;
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate max-w-[60%]" title={(isAr ? p.nameAr : p.nameEn) || ''}>
                        {isAr ? p.nameAr : p.nameEn}
                      </span>
                      <div className="flex items-center gap-2 text-sm">
                        {discounted ? (
                          <>
                            <span className="text-primary font-semibold">
                              {currency} {Number(p.discountPrice).toLocaleString(isAr?'ar-EG':'en-US')}
                            </span>
                            <span className="line-through text-muted-foreground">
                              {currency} {Number(p.price).toLocaleString(isAr?'ar-EG':'en-US')}
                            </span>
                            <span className="text-green-600 text-xs">
                              -{Math.round(100 - (Number(p.discountPrice!)/Number(p.price))*100)}%
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{currency} {Number(p.price).toLocaleString(isAr?'ar-EG':'en-US')}</span>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {Array.isArray(p.images) && p.images.length > 0 ? (
                          <img src={p.images[0].imageUrl} alt={(isAr?p.nameAr:p.nameEn) || ''} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">{isAr? 'لا صورة' : 'No image'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                          <span>{isAr? 'الفئة:' : 'Category:'} {p.categoryName}</span>
                          <span>{isAr? 'المخزون:' : 'Stock:'} {p.stockQuantity}</span>
                          <span>{isAr? 'التاجر:' : 'Merchant:'} {p.merchantName || p.merchantId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            defaultValue={discounted ? String(p.discountPrice) : ''}
                            placeholder={isAr ? 'سعر الخصم' : 'Discount price'}
                            onChange={(e)=>{ (p as any)._newDiscount = e.target.value; }}
                            className="max-w-[200px]"
                          />
                          <Button
                            disabled={savingId===p.id}
                            onClick={() => {
                              const raw = (p as any)._newDiscount as string | undefined;
                              const val = raw && raw.trim()!=='' ? Number(raw) : null;
                              void setDiscount(p, val);
                            }}
                          >
                            {savingId===p.id ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                          </Button>
                          {discounted && (
                            <Button variant="outline" disabled={savingId===p.id} onClick={() => void setDiscount(p, null)}>
                              {isAr ? 'إلغاء العرض' : 'Remove Offer'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
