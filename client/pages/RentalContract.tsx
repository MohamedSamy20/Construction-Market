import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Send } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useTranslation } from '../hooks/useTranslation';
import { RouteContext } from '../components/Router';
import { getRentalById, adjustRentalDays, sendRentalMessage } from '@/services/rentals';
import { getProductById } from '@/services/products';
import { toastSuccess, toastError } from '../utils/alerts';
import LoadingOverlay from '../components/LoadingOverlay';

interface Props extends Partial<RouteContext> {}

export default function RentalContractPage({ setCurrentPage, ...rest }: Props) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';

  const [rental, setRental] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [paid, setPaid] = useState(false);
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLTextAreaElement|null>(null);

  const isValidMongoId = (s: string) => /^[a-fA-F0-9]{24}$/.test(String(s || ''));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const qIdStr = String(url.searchParams.get('id') || '').trim();
        const raw = window.localStorage.getItem('selected_rental');
        const parsed = raw ? JSON.parse(raw) : null;
        const rid = String(qIdStr || parsed?.id || parsed?.rentalId || parsed?._id || '').trim();
        if (!rid) { if (!cancelled) setRental(parsed ?? null); return; }
        const res = await getRentalById(rid);
        let data:any = res.ok && res.data ? res.data : parsed;
        if (!data) return;
        if (!data.imageUrl && data.productId && isValidMongoId(String(data.productId)) && !String(data.productId).startsWith('contract:')) {
          try {
            const p = await getProductById(String(data.productId));
            if (p.ok && p.data) {
              const first = Array.isArray((p.data as any).images)
                ? ((p.data as any).images.map((im:any)=> im?.imageUrl).filter(Boolean)[0])
                : ((p.data as any).imageUrl || '');
              if (first) data.imageUrl = first;
            }
          } catch {}
        }
        if (!cancelled) setRental(data);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const images = rental?.imageUrl ? [rental.imageUrl] : [''];
  const baseDays = Number(rental?.rentalDays || 1);
  const [days, setDays] = useState<number>(baseDays);
  useEffect(()=>{ setDays(baseDays); }, [baseDays]);
  const dailyRate = Number(rental?.dailyRate || 0);
  const deposit = Number(rental?.securityDeposit || 0);
  const subtotal = (dailyRate * days) + deposit;
  const computedEndDate = (() => {
    try {
      if (!rental?.startDate) return rental?.endDate;
      const d = new Date(rental.startDate);
      if (isNaN(d.getTime())) return rental?.endDate;
      d.setDate(d.getDate() + Math.max(1, days) - 1);
      return d.toISOString().slice(0,10);
    } catch { return rental?.endDate; }
  })();

  const payNow = async () => {
    try {
      if (rental?.id) {
        await adjustRentalDays(String(rental.id), Number(days));
      }
      // Placeholder payment success
      setPaid(true);
      toastSuccess(locale==='ar'? 'تم الدفع بنجاح وتم تأجير المعدة' : 'Payment successful, equipment rented', locale==='ar');
    } catch {
      setPaid(true);
      toastSuccess(locale==='ar'? 'تم الدفع بنجاح وتم تأجير المعدة' : 'Payment successful, equipment rented', locale==='ar');
    }
  };

  // If navigated from a customer notification, focus the message box
  useEffect(() => {
    try {
      if (!rental?.id) return;
      let shouldOpen = false;
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const hint = url.searchParams.get('openMessagesFor');
        if (hint && String(hint) === String(rental.id)) shouldOpen = true;
        const local = localStorage.getItem('open_messages_contract');
        if (local && String(local) === String(rental.id)) shouldOpen = true;
        if (shouldOpen) {
          try {
            url.searchParams.delete('openMessagesFor');
            window.history.replaceState({}, '', url.toString());
            localStorage.removeItem('open_messages_contract');
          } catch {}
        }
      }
      if (shouldOpen) {
        messageRef.current?.focus();
        toastSuccess(locale==='ar'? 'لديك رد من التاجر، يمكنك الرد هنا' : 'You have a merchant reply. You can respond here.', locale==='ar');
      }
    } catch {}
  }, [rental?.id]);

  const sendMessage = async () => {
    if (!message.trim()) { toastError(locale==='ar'? 'اكتب رسالة أولاً' : 'Please write a message first', locale==='ar'); return; }
    try {
      if (rental?.id) {
        await sendRentalMessage(String(rental.id), { message });
      }
      toastSuccess(locale==='ar'? 'تم إرسال الرسالة للتاجر' : 'Message sent to merchant', locale==='ar');
      setMessage('');
    } catch {
      toastError(locale==='ar'? 'تعذر إرسال الرسالة' : 'Failed to send message', locale==='ar');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'? 'rtl':'ltr'}>
      <Header currentPage="rental-contract" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => setCurrentPage && setCurrentPage('home')} className="hover:text-primary">
            {locale==='ar'? 'الرئيسية' : 'Home'}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button onClick={() => setCurrentPage && setCurrentPage('rentals')} className="hover:text-primary">
            {locale==='ar' ? 'التأجير' : 'Rentals'}
          </button>
        </div>

        {!rental ? (
          <>
            <LoadingOverlay open={loading} message={locale==='ar' ? 'جاري تحميل العقد...' : 'Loading contract...'} />
            {!loading && (
              <div className="text-center text-muted-foreground py-24">{locale==='ar'? 'لا توجد بيانات للعقد.' : 'No contract data found.'}</div>
            )}
          </>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-4">
              <div className="relative">
                <ImageWithFallback
                  src={images[selectedImageIndex]}
                  alt={String(rental.productName || 'Rental')}
                  className="w-full h-96 object-cover rounded-lg"
                />
                <Badge className="absolute top-4 right-4 bg-primary">{locale==='ar'? 'عقد' : 'Contract'}</Badge>
                {images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                      onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                      disabled={selectedImageIndex === images.length - 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Info and payment */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">{String(rental.productName || 'Rental')}</h1>
                <div className="grid grid-cols-3 gap-3 text-sm bg-muted/30 rounded p-3 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'من' : 'From'}</div>
                    <div>{String(rental.startDate).slice(0,10)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'إلى' : 'To'}</div>
                    <div>{String(computedEndDate).slice(0,10)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'الأيام' : 'Days'}</div>
                    <div>{days}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary">{dailyRate} {currency} <span className="text-base font-normal text-muted-foreground">/ {locale==='ar'? 'يوم' : 'day'}</span></div>
              </div>

              {/* Days selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">{locale==='ar'? 'عدد الأيام' : 'Number of days'}:</label>
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="sm" onClick={() => setDays((d)=> Math.max(1, d-1))} disabled={days<=1}>-</Button>
                  <input
                    type="number"
                    className="w-20 text-center outline-none"
                    value={days}
                    min={1}
                    onChange={(e)=> setDays(Math.max(1, Number(e.target.value||1)))}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setDays((d)=> Math.min(365, d+1))}>+</Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{locale==='ar'? 'إجمالي الإيجار (عدد الأيام)' : 'Rental total (days)'}</span>
                    <span className="font-medium">{dailyRate} × {days} = {(dailyRate*days).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{locale==='ar'? 'التأمين (قابل للاسترداد)' : 'Security deposit (refundable)'}</span>
                    <span className="font-medium">{deposit.toLocaleString(locale==='ar'?'ar-EG':'en-US')} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-semibold">{locale==='ar'? 'الإجمالي المستحق الآن' : 'Total due now'}</span>
                    <span className="font-semibold text-primary">{subtotal.toLocaleString(locale==='ar'?'ar-EG':'en-US')} {currency}</span>
                  </div>
                </CardContent>
              </Card>

              {!paid ? (
                <Button className="w-full" onClick={payNow}>
                  <ShoppingCart className="h-4 w-4 ml-2" /> {locale==='ar'? 'ادفع الآن' : 'Pay now'}
                </Button>
              ) : (
                <div className="rounded-md border p-4 bg-green-50 text-green-700 flex items-center gap-2">
                  <Check className="h-5 w-5" /> {locale==='ar'? 'تم الدفع وتم تأجير المعدة.' : 'Payment completed and equipment rented.'}
                </div>
              )}

              <div className="space-y-2">
                <Label>{locale==='ar'? 'رسالة للتاجر (موقع الاستلام / ملاحظات)' : 'Message to merchant (pickup location / notes)'}</Label>
                <Textarea id="message" ref={messageRef as any} value={message} onChange={(e)=> setMessage(e.target.value)} rows={4} placeholder={locale==='ar'? 'مثال: استلام المعدة من يوم السبت عند الساعة 10 صباحاً' : 'Example: Pick up the equipment on Saturday at 10 AM'} />
                <div className="flex justify-end">
                  <Button variant="outline" onClick={sendMessage}><Send className="h-4 w-4 ml-2" />{locale==='ar'? 'إرسال' : 'Send'}</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
