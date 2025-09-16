import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getPendingRentals, approveRental, declineRental } from '@/services/rentals';

interface Props extends Partial<RouteContext> {}

export default function AdminRentals({ setCurrentPage, ...rest }: Props) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getPendingRentals();
      if (r.ok && Array.isArray(r.data)) setItems(r.data as any[]);
      else setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onApprove = async (id: number) => { await approveRental(id); await load(); };
  const onDecline = async (id: number) => { await declineRental(id); await load(); };

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'?'rtl':'ltr'}>
      <Header currentPage="admin-rentals" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale==='ar'? 'عقود التأجير في انتظار الموافقة' : 'Pending Rental Contracts'}</h1>
            <p className="text-muted-foreground">{locale==='ar'? 'اعتمد أو ارفض ظهور العقود للعامة' : 'Approve or decline contracts for public listing'}</p>
          </div>
          <Button variant="outline" onClick={load}>{locale==='ar'? 'تحديث' : 'Refresh'}</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{locale==='ar'? 'قائمة العقود' : 'Contracts'} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'جارٍ التحميل...' : 'Loading...'}</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد عقود بانتظار الموافقة' : 'No contracts pending approval'}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((r:any)=> (
                  <Card key={r.id} className="group transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        <ImageWithFallback src={r.imageUrl || ''} alt={String(r.productName || '')} className="w-full h-40 object-cover rounded bg-gray-100" />
                      </div>
                      <div className="font-medium line-clamp-1">{r.productName || `#${r.productId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `من ${new Date(r.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(r.endDate).toLocaleDateString('ar-EG')}` : `From ${new Date(r.startDate).toLocaleDateString('en-US')} to ${new Date(r.endDate).toLocaleDateString('en-US')}`}
                      </div>
                      <div className="mt-2 grid grid-cols-3 text-sm text-muted-foreground">
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الأيام' : 'Days'}</div>
                          <div className="font-medium">{r.rentalDays}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily'}</div>
                          <div className="font-medium">{r.dailyRate}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الإجمالي' : 'Total'}</div>
                          <div className="font-semibold">{r.totalAmount}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button size="sm" variant="default" onClick={()=> onApprove(Number(r.id))}>{locale==='ar'? 'اعتماد' : 'Approve'}</Button>
                        <Button size="sm" variant="destructive" onClick={()=> onDecline(Number(r.id))}>{locale==='ar'? 'رفض' : 'Decline'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
