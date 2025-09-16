import { useState, useEffect, useRef } from 'react';
import { Search, Package, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useTranslation } from '../../hooks/useTranslation';
import { toastError, toastSuccess } from '../../utils/alerts';
import { getMyProducts } from '@/services/products';
import { listMyRentals, createRental, type CreateRentalInput, updateRental, deleteRental, listRentalMessages, replyRentalMessage } from '@/services/rentals';
import { getCommissionRates } from '@/services/commissions';

// This page mirrors VendorProducts but for rentals. It reuses ProductForm and ProductItem for speed.

type VendorRentalsProps = Partial<RouteContext>;

export default function VendorRentals({ setCurrentPage, ...context }: VendorRentalsProps) {
  const { locale } = useTranslation();
  const [rentals, setRentals] = useState<any[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any|null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editDeposit, setEditDeposit] = useState('');
  const [editCurrency, setEditCurrency] = useState('SAR');
  const [editSpecial, setEditSpecial] = useState('');
  const [editUsage, setEditUsage] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editProductId, setEditProductId] = useState<string>('');
  // Messages dialog
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<any|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgReply, setMsgReply] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  // Form fields
  // product free text (machine name) with backend mapping to productId
  const [machineName, setMachineName] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dailyRate, setDailyRate] = useState<string>('');
  const [securityDeposit, setSecurityDeposit] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [images, setImages] = useState<string[]>([]);
  // Delivery/Pickup removed from UI for now
  const [requiresDelivery, setRequiresDelivery] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [requiresPickup, setRequiresPickup] = useState<boolean>(false);
  const [pickupFee, setPickupFee] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [usageNotes, setUsageNotes] = useState<string>('');
  const [myProducts, setMyProducts] = useState<any[]>([]);

  const safeSetCurrentPage = setCurrentPage ?? (() => {});

  // Derived calculations for create form
  const parsedDaily = Number(dailyRate || 0) || 0;
  const parsedDeposit = Number(securityDeposit || 0) || 0;
  const days = (() => {
    if (!startDate || !endDate) return 0;
    try {
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T00:00:00');
      const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    } catch { return 0; }
  })();
  const computedTotal = (parsedDaily * (days || 0)) + parsedDeposit;
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [ratesCurrency, setRatesCurrency] = useState<string>('SAR');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rents, prods] = await Promise.all([listMyRentals(), getMyProducts()]);
        if (!cancelled) {
          setRentals(Array.isArray(rents.data) ? (rents.data as any[]) : []);
          setMyProducts(Array.isArray(prods.data) ? (prods.data as any[]) : []);
        }
      } catch {
        if (!cancelled) { setRentals([]); toastError(locale==='ar'?'فشل تحميل التأجير':'Failed to load rentals', locale==='ar'); }
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  // Load commission rates for rentals (uses products commission rate)
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getCommissionRates();
        if (ok && (data as any)?.rates) {
          setCommissionPct(Number((data as any).rates.products || 0));
          setRatesCurrency(String((data as any).rates.currency || 'SAR'));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let filtered = rentals;
    if (searchTerm) {
      filtered = filtered.filter((r: any) =>
        (r.name || '').includes(searchTerm) ||
        (r.partNumber || '').includes(searchTerm) ||
        (r.brand || '').includes(searchTerm)
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((r: any) => r.category === selectedCategory);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r: any) => r.status === selectedStatus);
    }
    setFilteredRentals(filtered);
  }, [searchTerm, selectedCategory, selectedStatus, rentals]);

  const resetForm = () => {
    setMachineName(''); setProductId(''); setCustomerId(''); setStartDate(''); setEndDate(''); setDailyRate(''); setSecurityDeposit('');
    setCurrency('SAR'); setRequiresDelivery(false); setDeliveryAddress(''); setDeliveryFee(''); setRequiresPickup(false); setPickupFee(''); setSpecialInstructions(''); setUsageNotes(''); setImages([]);
  };

  // Read hint from URL/localStorage to auto-open messages for a rental
  useEffect(() => {
    try {
      let id: string | null = null;
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        id = url.searchParams.get('openMessagesFor');
        if (!id) id = localStorage.getItem('open_messages_rental');
      }
      if (id) setPendingOpenId(id);
    } catch {}
  }, []);

  // Listen to custom event from Header to open messages instantly when clicking a notification
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        const rid = String(detail.rentalId || '');
        if (!rid) return;
        setPendingOpenId(rid);
        // also persist so a subsequent navigation still works
        try { localStorage.setItem('open_messages_rental', rid); } catch {}
      } catch {}
    };
    window.addEventListener('open_messages_rental', handler as any);
    return () => {
      window.removeEventListener('open_messages_rental', handler as any);
    };
  }, []);

  // Once rentals are loaded, open dialog if requested
  useEffect(() => {
    if (!pendingOpenId) return;
    const r = rentals.find((x:any) => String(x.id) === String(pendingOpenId));
    if (r) {
      openMessages(r);
      setPendingOpenId(null);
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('openMessagesFor');
          window.history.replaceState({}, '', url.toString());
          localStorage.removeItem('open_messages_rental');
        }
      } catch {}
    }
  }, [pendingOpenId, rentals]);

  const openMessages = async (r:any) => {
    setMsgTarget(r); setMsgOpen(true); setMessages([]); setMsgReply(''); setMsgLoading(true);
    try {
      const res = await listRentalMessages(Number(r.id));
      if (res.ok && Array.isArray(res.data)) setMessages(res.data as any[]);
    } finally { setMsgLoading(false); }
  };

  const sendReply = async () => {
    if (!msgTarget || !msgReply.trim()) return;
    setMsgLoading(true);
    try {
      const res = await replyRentalMessage(Number(msgTarget.id), msgReply.trim());
      if (res.ok) {
        setMsgReply('');
        const r2 = await listRentalMessages(Number(msgTarget.id));
        if (r2.ok && Array.isArray(r2.data)) setMessages(r2.data as any[]);
        // refresh counts
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      }
    } finally { setMsgLoading(false); }
  };

  const openEdit = (r:any) => {
    setEditTarget(r);
    setEditStart(String(r.startDate).slice(0,10));
    setEditEnd(String(r.endDate).slice(0,10));
    setEditRate(String(r.dailyRate ?? ''));
    setEditDeposit(String(r.securityDeposit ?? ''));
    setEditCurrency(String(r.currency || 'SAR'));
    setEditSpecial(String(r.specialInstructions || ''));
    setEditUsage(String(r.usageNotes || ''));
    setEditMachine(String(r.productName || ''));
    setEditProductId(r.productId ? String(r.productId) : '');
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      const res = await updateRental(Number(editTarget.id), {
        startDate: editStart,
        endDate: editEnd,
        dailyRate: Number(editRate||0),
        securityDeposit: editDeposit ? Number(editDeposit) : 0,
        currency: editCurrency,
        specialInstructions: editSpecial,
        usageNotes: editUsage,
        productId: editProductId ? Number(editProductId) : undefined,
      });
      if (res.ok) {
        toastSuccess(locale==='ar'? 'تم تحديث العقد' : 'Rental updated', locale==='ar');
        setEditOpen(false);
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        toastError(locale==='ar'? 'فشل تحديث العقد' : 'Failed to update rental', locale==='ar');
      }
    } finally { setSaving(false); }
  };

  const removeRental = async (r:any) => {
    try {
      if (!confirm(locale==='ar'? 'هل تريد حذف هذا العقد؟' : 'Delete this rental?')) return;
      const res = await deleteRental(Number(r.id));
      if (res.ok) {
        toastSuccess(locale==='ar'? 'تم حذف العقد' : 'Rental deleted', locale==='ar');
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        toastError(locale==='ar'? 'فشل حذف العقد' : 'Failed to delete rental', locale==='ar');
      }
    } catch {
      toastError(locale==='ar'? 'فشل حذف العقد' : 'Failed to delete rental', locale==='ar');
    }
  };

  const submitRental = async () => {
    try {
      // If no matched product, fallback to first available product owned by merchant.
      const effectiveProductId = productId || (myProducts?.[0]?.id ? String(myProducts[0].id) : '');
      if (!effectiveProductId) {
        toastError(locale==='ar'? 'لا يوجد منتج مسجل لربط العقد به. يرجى إضافة منتج واحد على الأقل.' : 'No product available to link the rental. Please add at least one product.', locale==='ar');
        return;
      }
      if (!startDate || !endDate || !dailyRate || !securityDeposit) {
        toastError(locale==='ar'? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields', locale==='ar');
        return;
      }
      setSaving(true);
      const payload: CreateRentalInput = {
        productId: Number(effectiveProductId),
        customerId: (customerId || '').trim(),
        startDate, endDate,
        dailyRate: Number(dailyRate),
        currency,
        securityDeposit: Number(securityDeposit),
        // Delivery/Pickup removed
        requiresDelivery: false,
        requiresPickup: false,
        specialInstructions: [specialInstructions, machineName ? `${locale==='ar' ? 'اسم الآلة' : 'Machine'}: ${machineName}` : ''].filter(Boolean).join(' | ') || undefined,
        usageNotes: usageNotes || undefined,
      };
      const res = await createRental(payload);
      if (res.ok) {
        toastSuccess(locale==='ar'? 'تم إنشاء عقد التأجير' : 'Rental created', locale==='ar');
        setDialogOpen(false);
        resetForm();
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        toastError(locale==='ar'? 'فشل إنشاء عقد التأجير' : 'Failed to create rental', locale==='ar');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="vendor-rentals" setCurrentPage={safeSetCurrentPage} {...context} />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale === 'en' ? 'Rental Management' : 'إدارة التأجير'}</h1>
            <p className="text-muted-foreground">{locale === 'en' ? 'Manage your rentals' : 'إدارة خدمات التأجير'}</p>
          </div>
          <div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {locale==='ar'? 'إضافة تأجير' : 'Add Rental'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{locale==='ar'? 'إضافة عقد تأجير' : 'Create Rental'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{locale==='ar'? 'الآلة' : 'Machine'}</Label>
                    <Input
                      value={machineName}
                      onChange={(e)=> {
                        const val = e.target.value;
                        setMachineName(val);
                        // try to match a product by name and set its id for backend
                        const match = (myProducts || []).find((p:any)=> String(p.name || '').toLowerCase().includes(val.toLowerCase()));
                        setProductId(match ? String(match.id) : '');
                      }}
                      placeholder={locale==='ar'? 'اكتب اسم الآلة' : 'Type machine name'}
                    />
                    {productId && (
                      <div className="text-xs text-green-600">
                        {locale==='ar'? `تم التعرف على المنتج (ID ${productId}) تلقائياً` : `Matched product (ID ${productId})`}
                      </div>
                    )}
                  </div>
                  {/* Optional images upload for the contract */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>{locale==='ar'? 'صور العقد (اختياري)' : 'Contract images (optional)'}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e)=>{
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          const readers = files.map((file)=> new Promise<string>((resolve)=>{
                            const fr = new FileReader();
                            fr.onload = ()=> resolve(String(fr.result || ''));
                            fr.readAsDataURL(file);
                          }));
                          Promise.all(readers).then((base64s)=> setImages(prev=> [...prev, ...base64s]));
                        }}
                      />
                      {images.length > 0 && (
                        <span className="text-xs text-muted-foreground">{locale==='ar'? `${images.length} صورة مضافة` : `${images.length} image(s) added`}</span>
                      )}
                    </div>
                    {images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {images.map((src, idx)=> (
                          <div key={idx} className="relative w-16 h-16 border rounded overflow-hidden bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`img-${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 bg-white/90 border rounded-full w-5 h-5 text-xs"
                              title={locale==='ar'? 'حذف' : 'Remove'}
                              onClick={()=> setImages(prev=> prev.filter((_,i)=> i!==idx))}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'تاريخ البدء' : 'Start date'}</Label>
                    <Input type="date" value={startDate} onChange={(e)=> setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'تاريخ الانتهاء' : 'End date'}</Label>
                    <Input type="date" value={endDate} onChange={(e)=> setEndDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'سعر اليوم' : 'Daily rate'}</Label>
                    <Input type="number" inputMode="decimal" value={dailyRate} onChange={(e)=> setDailyRate(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'تأمين (إجباري)' : 'Security deposit (required)'}</Label>
                    <Input type="number" inputMode="decimal" value={securityDeposit} onChange={(e)=> setSecurityDeposit(e.target.value)} placeholder="0.00" required />
                  </div>
                  {/* Auto-calculated summary */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="text-sm text-muted-foreground">
                      {locale==='ar' ? 'الأيام' : 'Days'}: <span className="font-medium">{days || 0}</span>
                    </div>
                    <div className="text-sm">
                      {locale==='ar' ? 'الإجمالي (يحسب تلقائيًا = الأيام × سعر اليوم + التأمين)' : 'Total (auto = days × daily + deposit)'}:
                      <span className="ml-1 font-semibold">{computedTotal.toLocaleString(locale==='ar' ? 'ar-EG' : 'en-US')}</span>
                      <span className="ml-1 text-muted-foreground">{currency}</span>
                    </div>
                    {(() => {
                      const v = Number(computedTotal || 0);
                      if (!isFinite(v) || v <= 0) return null;
                      const comm = Math.round(v * (commissionPct / 100));
                      const net = Math.max(v - comm, 0);
                      const numLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
                      return (
                        <div className="mt-1 text-xs text-muted-foreground">
                          <div>
                            {locale==='ar' ? 'عمولة التأجير' : 'Rental commission'} {commissionPct}%: {comm.toLocaleString(numLocale)} {ratesCurrency==='SAR' ? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                          </div>
                          <div>
                            {locale==='ar' ? 'الصافي بعد الخصم' : 'Net after commission'}: {net.toLocaleString(numLocale)} {ratesCurrency==='SAR' ? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'العملة' : 'Currency'}</Label>
                    <Input value={currency} readOnly placeholder="SAR" />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'ملاحظات الاستخدام' : 'Usage notes'}</Label>
                    <Textarea value={usageNotes} onChange={(e)=> setUsageNotes(e.target.value)} />
                  </div>
                </div>
                {/* Delivery/Pickup removed from the form as requested */}
                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={()=> { setDialogOpen(false); }}>
                    {locale==='ar'? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={submitRental} disabled={saving}>
                    {saving ? (locale==='ar'? 'جارٍ الحفظ...' : 'Saving...') : (locale==='ar'? 'حفظ' : 'Save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={locale === 'en' ? 'Search rentals...' : 'ابحث في التأجير...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={locale === 'en' ? 'Category' : 'الفئة'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{locale === 'en' ? 'All Categories' : 'جميع الفئات'}</SelectItem>
                    {/* Categories are free-form for now */}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={locale === 'en' ? 'Status' : 'الحالة'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{locale === 'en' ? 'All Statuses' : 'جميع الحالات'}</SelectItem>
                    <SelectItem value="active">{locale === 'en' ? 'Active' : 'نشط'}</SelectItem>
                    <SelectItem value="draft">{locale === 'en' ? 'Draft' : 'مسودة'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rentals List */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'en' ? 'Rentals' : 'التأجير'} ({filteredRentals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{locale === 'en' ? 'No rentals' : 'لا توجد عناصر تأجير'}</h3>
                <p className="text-muted-foreground">{locale === 'en' ? 'Start by adding your first rental' : 'ابدأ بإضافة أول عنصر تأجير لك'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRentals.map((rental:any) => (
                  <Card key={rental.id} className="group hover:shadow-lg transition-all duration-300 relative">
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={rental.imageUrl || ''} alt={String(rental.productName || '')} className="w-full h-40 object-cover rounded bg-gray-100" />
                        <span className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground rounded px-2 py-0.5">{locale==='ar'? 'عقد' : 'Contract'}</span>
                      </div>
                      <div className="font-medium line-clamp-1">{rental.productName || `#${rental.productId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `من ${new Date(rental.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(rental.endDate).toLocaleDateString('ar-EG')}` : `From ${new Date(rental.startDate).toLocaleDateString('en-US')} to ${new Date(rental.endDate).toLocaleDateString('en-US')}`}
                      </div>
                      <div className="mt-2 grid grid-cols-3 text-sm text-muted-foreground">
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الأيام' : 'Days'}</div>
                          <div className="font-medium">{rental.rentalDays}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily'}</div>
                          <div className="font-medium">{rental.dailyRate}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الإجمالي' : 'Total'}</div>
                          <div className="font-semibold">{rental.totalAmount}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button size="sm" variant="secondary" onClick={()=> openMessages(rental)}>{locale==='ar'? 'الرسائل' : 'Messages'}</Button>
                        <Button size="sm" variant="outline" onClick={()=> openEdit(rental)}>{locale==='ar'? 'تعديل' : 'Edit'}</Button>
                        <Button size="sm" variant="destructive" onClick={()=> removeRental(rental)}>{locale==='ar'? 'حذف' : 'Delete'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{locale==='ar'? 'تعديل عقد التأجير' : 'Edit Rental'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>{locale==='ar'? 'الآلة' : 'Machine'}</Label>
                <Input
                  value={editMachine}
                  onChange={(e)=>{
                    const val = e.target.value; setEditMachine(val);
                    const match = (myProducts || []).find((p:any)=> String(p.name || '').toLowerCase().includes(val.toLowerCase()));
                    setEditProductId(match ? String(match.id) : '');
                  }}
                  placeholder={locale==='ar'? 'اكتب اسم الآلة' : 'Type machine name'}
                />
                {editProductId && (
                  <div className="text-xs text-green-600 mt-1">
                    {locale==='ar'? `تم التعرف على المنتج (ID ${editProductId}) تلقائياً` : `Matched product (ID ${editProductId})`}
                  </div>
                )}
              </div>
              <div>
                <Label>{locale==='ar'? 'تاريخ البدء' : 'Start date'}</Label>
                <Input type="date" value={editStart} onChange={(e)=> setEditStart(e.target.value)} />
              </div>
              <div>
                <Label>{locale==='ar'? 'تاريخ الانتهاء' : 'End date'}</Label>
                <Input type="date" value={editEnd} onChange={(e)=> setEditEnd(e.target.value)} />
              </div>
              <div>
                <Label>{locale==='ar'? 'سعر اليوم' : 'Daily rate'}</Label>
                <Input type="number" inputMode="decimal" value={editRate} onChange={(e)=> setEditRate(e.target.value)} />
              </div>
              <div>
                <Label>{locale==='ar'? 'التأمين' : 'Deposit'}</Label>
                <Input type="number" inputMode="decimal" value={editDeposit} onChange={(e)=> setEditDeposit(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>{locale==='ar'? 'العملة' : 'Currency'}</Label>
                <Input value={editCurrency} onChange={(e)=> setEditCurrency(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>{locale==='ar'? 'تعليمات خاصة' : 'Special instructions'}</Label>
                <Textarea value={editSpecial} onChange={(e)=> setEditSpecial(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>{locale==='ar'? 'ملاحظات الاستخدام' : 'Usage notes'}</Label>
                <Textarea value={editUsage} onChange={(e)=> setEditUsage(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={()=> setEditOpen(false)}>{locale==='ar'? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={submitEdit} disabled={saving}>{saving ? (locale==='ar'? 'جارٍ الحفظ...' : 'Saving...') : (locale==='ar'? 'حفظ' : 'Save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Messages Dialog */}
        <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{locale==='ar'? 'رسائل العقد' : 'Rental Messages'}</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 overflow-auto border rounded p-3 bg-muted/30">
              {msgLoading ? (
                <div className="text-sm text-muted-foreground">{locale==='ar'? 'تحميل...' : 'Loading...'}</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد رسائل بعد' : 'No messages yet'}</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m:any, idx:number)=> (
                    <div key={idx} className={`rounded p-2 ${m.fromMerchant? 'bg-blue-50 text-blue-900' : 'bg-white'}`}>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{m.fromMerchant ? (locale==='ar'? 'التاجر' : 'Merchant') : (m.name || 'Customer')}</span>
                        <span>{String(m.at).replace('T',' ').slice(0,16)}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 mt-3">
              <Label>{locale==='ar'? 'رد' : 'Reply'}</Label>
              <Textarea rows={3} value={msgReply} onChange={(e)=> setMsgReply(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=> setMsgOpen(false)}>{locale==='ar'? 'إغلاق' : 'Close'}</Button>
                <Button onClick={sendReply} disabled={msgLoading || !msgReply.trim()}>{msgLoading ? (locale==='ar'? 'جارٍ الإرسال...' : 'Sending...') : (locale==='ar'? 'إرسال' : 'Send')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Footer setCurrentPage={safeSetCurrentPage} />
    </div>
  );
}
