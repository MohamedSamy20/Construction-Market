import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getPublicServices, type ServiceItem, getServiceTypes, type ServiceTypeItem, getAdminPendingServices, approveService, rejectService } from '@/services/services';

export default function AdminServiceOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAdmin = (props.user?.role || '').toLowerCase() === 'admin';
  const [tab, setTab] = useState<'public' | 'pending'>('public');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [pending, setPending] = useState<Array<{ id: number; title: string; description: string; merchantId: string; payRate: number; currency: string; createdAt: string }>>([]);
  const [types, setTypes] = useState<ServiceTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all'|'pending'|'completed'>('all');
  const [query, setQuery] = useState('');
  const [typeId, setTypeId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [typesRes, dataRes] = await Promise.all([
          getServiceTypes(),
          tab === 'public' ? getPublicServices() : getAdminPendingServices()
        ]);
        if (!cancelled) {
          if (typesRes.ok && Array.isArray(typesRes.data)) setTypes(typesRes.data as ServiceTypeItem[]);
          if (tab === 'public') {
            if (dataRes.ok && Array.isArray(dataRes.data)) setServices(dataRes.data as ServiceItem[]);
          } else {
            if (dataRes.ok && dataRes.data && Array.isArray((dataRes.data as any).items)) setPending((dataRes.data as any).items);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const filtered = useMemo(() => {
    if (tab === 'public') {
      let list = services;
      // status filter
      if (status === 'completed') list = list.filter(s => (s.status||'').toLowerCase() === 'completed');
      else if (status === 'pending') list = list.filter(s => ['open','inprogress'].includes((s.status||'').toLowerCase()));
      // type filter (by technicianType or requiredSkills)
      if (typeId) list = list.filter(s => (s.technicianType || s.requiredSkills || '').toLowerCase().includes(typeId.toLowerCase()));
      // text query in description or location
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(s => (s.description||'').toLowerCase().includes(q) || (s as any).location?.toLowerCase?.().includes(q));
      }
      return list;
    } else {
      // pending list: apply text filter only
      let list = pending;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(p => (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
      }
      return list;
    }
  }, [services, pending, status, typeId, query, tab]);

  const onApprove = async (id: number) => {
    const { ok } = await approveService(id);
    if (ok) {
      // remove from pending list
      setPending(prev => prev.filter(p => p.id !== id));
    } else {
      alert(locale==='ar' ? 'فشل الاعتماد' : 'Approve failed');
    }
  };

  const onReject = async (id: number) => {
    const reason = window.prompt(locale==='ar' ? 'سبب الرفض (اختياري)' : 'Rejection reason (optional)') || '';
    const { ok } = await rejectService(id, reason);
    if (ok) {
      setPending(prev => prev.filter(p => p.id !== id));
    } else {
      alert(locale==='ar' ? 'فشل الرفض' : 'Reject failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'الخدمات' : 'Services'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'بحث وفلترة بالحالة والنوع، وإدارة اعتماد/رفض للخدمات.' : 'Search and filter by status/type, with approve/reject management.'}</p>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{locale==='ar' ? 'الخدمات' : 'Services'}</CardTitle>
                <div className="flex gap-2">
                  <Button variant={tab==='public' ? 'default' : 'outline'} onClick={() => setTab('public')}>{locale==='ar' ? 'العامة المعتمدة' : 'Approved Public'}</Button>
                  <Button variant={tab==='pending' ? 'default' : 'outline'} onClick={() => setTab('pending')} disabled={!isAdmin}>{locale==='ar' ? 'قيد الاعتماد' : 'Pending Approval'}</Button>
                </div>
              </div>
              {tab === 'public' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input placeholder={locale==='ar' ? 'بحث...' : 'Search...'} value={query} onChange={(e) => setQuery(e.target.value)} />
                  <select className="border rounded-md h-10 px-2" value={typeId} onChange={(e)=>setTypeId(e.target.value)}>
                    <option value="">{locale==='ar' ? 'كل الأنواع' : 'All types'}</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{locale==='ar' ? t.ar : t.en}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button variant={status==='all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>{locale==='ar' ? 'الكل' : 'All'}</Button>
                    <Button variant={status==='pending' ? 'default' : 'outline'} onClick={() => setStatus('pending')}>{locale==='ar' ? 'قيد الانتظار' : 'Pending'}</Button>
                    <Button variant={status==='completed' ? 'default' : 'outline'} onClick={() => setStatus('completed')}>{locale==='ar' ? 'مكتملة' : 'Completed'}</Button>
                  </div>
                </div>
              )}
              {tab === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder={locale==='ar' ? 'بحث في العنوان/الوصف' : 'Search title/description'} value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (<div key={i} className="h-32 rounded bg-gray-100 animate-pulse" />))}
              </div>
            ) : (
              <>
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد خدمات.' : 'No services.'}</div>
                ) : (
                  <div className="space-y-2">
                    {tab === 'public' && (filtered as ServiceItem[]).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{s.description}</div>
                          <div className="text-xs text-muted-foreground">#{s.id} · {locale==='ar' ? 'الحالة' : 'Status'}: {locale==='ar' ? (['open','inprogress'].includes((s.status||'').toLowerCase()) ? 'قيد الانتظار' : s.status) : s.status}</div>
                          <div className="text-xs text-muted-foreground">
                            {locale==='ar' ? 'الموقع' : 'Location'}: {(s as any).location ?? '-'} · {locale==='ar' ? 'بداية' : 'Start'}: {(s.startDate ? new Date(s.startDate).toLocaleDateString() : '-')} · {locale==='ar' ? 'نهاية' : 'End'}: {(s.endDate ? new Date(s.endDate).toLocaleDateString() : '-')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {locale==='ar' ? 'أجر يومي' : 'Daily'}: {s.dailyWage} {s.days != null && <>· {locale==='ar' ? 'أيام' : 'Days'}: {s.days}</>} {s.total != null && <>· {locale==='ar' ? 'الإجمالي' : 'Total'}: {s.total}</>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {tab === 'pending' && isAdmin && (filtered as typeof pending).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{p.title || p.description}</div>
                          <div className="text-xs text-muted-foreground">#{p.id} · {locale==='ar' ? 'التاريخ' : 'Date'}: {new Date(p.createdAt).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{locale==='ar' ? 'الأجر' : 'Pay'}: {p.payRate} {p.currency}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => void onApprove(p.id)}>{locale==='ar' ? 'اعتماد' : 'Approve'}</Button>
                          <Button variant="destructive" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void onReject(p.id)}>{locale==='ar' ? 'رفض' : 'Reject'}</Button>
                        </div>
                      </div>
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
