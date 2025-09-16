import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Store, Search, Filter, Plus, Edit, Trash2, MapPin, Mail, Phone, ArrowRight, CheckCircle, Ban, Eye } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { getPendingMerchants, getUsers as adminGetUsers, approveMerchant, suspendMerchant } from '@/services/admin';
import { successAlert, warningAlert } from '../../utils/alerts';
import { getAdminUserById, type AdminUserDetails } from '@/services/adminUsers';

type VendorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'suspended';
  joinDate?: string;
};

export default function AdminVendors({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | VendorRow['status']>('all');
  const [pendingVendors, setPendingVendors] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<AdminUserDetails | null>(null);

  useEffect(() => { void loadVendors(); void loadPending(); }, []);
  const loadVendors = async () => {
    try {
      const res = await adminGetUsers({ role: 'Merchant' });
      if (res.ok && res.data && Array.isArray((res.data as any).items)) {
        const list = (res.data as any).items.map((u:any) => ({
          id: String(u.id),
          name: u.name || '',
          email: u.email || '',
          phone: u.phoneNumber || '',
          status: u.isActive ? 'active' : (u.isVerified ? 'active' : 'pending')
        } as VendorRow));
        setRows(list);
      } else setRows([]);
    } catch { setRows([]); }
  };

  const openView = async (userId: string) => {
    setViewOpen(true); setViewLoading(true); setViewError(null); setViewUser(null);
    try {
      const res = await getAdminUserById(userId);
      if (res.ok && res.data && (res.data as any).item) {
        setViewUser((res.data as any).item as AdminUserDetails);
      } else {
        setViewError('Failed to load user');
      }
    } catch (e) { setViewError('Failed to load user'); }
    finally { setViewLoading(false); }
  };
  const loadPending = async () => {
    try {
      const r = await getPendingMerchants();
      if (r.ok && r.data && Array.isArray((r.data as any).items)) setPendingVendors((r.data as any).items);
      else setPendingVendors([]);
    } catch { setPendingVendors([]); }
  };

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    const matches = !s || r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s);
    const statusOk = status === 'all' || r.status === status;
    return matches && statusOk;
  });

  const approveVendor = async (u: { id: string; name?: string }) => {
    try { const r = await approveMerchant(u.id); if (r.ok) { await successAlert(t('activatedSuccessfully') || 'تم التفعيل بنجاح', true); await loadPending(); await loadVendors(); } }
    catch { /* ignore */ }
  };
  const rejectVendor = async (u: { id: string; name?: string }) => {
    try { const r = await suspendMerchant(u.id); if (r.ok) { await warningAlert(t('suspendedSuccessfully') || 'تم التعليق', true); await loadPending(); await loadVendors(); } }
    catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')} className="mr-4">
              <ArrowRight className="ml-2 h-4 w-4" />
              {t('backToDashboard')}
            </Button>
          </div>
          <h1 className="mb-2">{t('manageVendorsTitle')}</h1>
          <p className="text-muted-foreground">{t('manageVendorsSubtitle')}</p>
        </div>

        {/* Pending vendor approvals from backend */}
        {pendingVendors.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center"><Store className="mr-2 h-5 w-5" />{t('pendingVendors') || 'طلبات بائعين قيد المراجعة'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingVendors.map((u:any) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                    <div className="space-y-0.5 w-full min-w-0">
                      <div className="font-medium break-words max-w-full leading-snug">{u.name}</div>
                      <div className="text-sm text-muted-foreground break-words">{u.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={()=>approveVendor(u)}><CheckCircle className="h-4 w-4 mr-1" />{t('approve') || 'موافقة'}</Button>
                      <Button size="sm" variant="outline" onClick={()=>rejectVendor(u)}><Ban className="h-4 w-4 mr-1" />{t('reject') || 'رفض'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />{t('searchAndFilter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('searchByNameOrEmail')} value={search} onChange={e=>setSearch(e.target.value)} className="pr-10" />
              </div>
              <Select value={status} onValueChange={(v:any)=>setStatus(v)}>
                <SelectTrigger><SelectValue placeholder={t('statusLabel')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('activeStatus')}</SelectItem>
                  <SelectItem value="pending">{t('pendingStatus')}</SelectItem>
                  <SelectItem value="suspended">{t('suspendedStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Store className="mr-2 h-5 w-5" />{t('vendors')} ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse w-full min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><Store className="h-6 w-6 text-primary" /></div>
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words max-w-full leading-snug">{r.name}</h3>
                        <Badge variant={r.status==='active'?'default': r.status==='pending'? 'secondary':'destructive'}>
                          {r.status==='active'? t('activeStatus') : r.status==='pending' ? t('pendingStatus') : t('suspendedStatus')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center break-words"><Phone className="mr-1 h-3 w-3" />{r.phone}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=>openView(r.id)}><Eye className="h-4 w-4" /></Button>
                    {r.status==='active' ? (
                      <Button size="sm" variant="outline" onClick={()=>suspendMerchant(r.id)}><Ban className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={()=>approveMerchant(r.id)}><CheckCircle className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length===0 && (
              <div className="text-center py-8 text-muted-foreground">{t('noResults')}</div>
            )}
          </CardContent>
        </Card>

        {/* Removed local add/edit vendor dialog – vendors are managed via backend only */}

        {/* View user dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('userDetails') || 'تفاصيل المستخدم'}</DialogTitle>
            </DialogHeader>
            {viewLoading && (
              <div className="text-sm text-muted-foreground">{t('loading') || 'جارٍ التحميل...'}</div>
            )}
            {viewError && (
              <div className="text-sm text-red-600">{viewError}</div>
            )}
            {viewUser && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                {/* Left: big preview images */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Profile picture */}
                  <div>
                    <Label className="text-muted-foreground">الصورة الشخصية</Label>
                    <div className="mt-2 w-full h-56 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {viewUser.profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={viewUser.profilePicture} alt="profile" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  {/* License/document image preview if image */}
                  <div>
                    <Label className="text-muted-foreground">صورة الرخصة / المستند</Label>
                    <div className="mt-2 w-full h-56 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {(() => {
                        const url = (viewUser.licenseImagePath || viewUser.documentPath || '').toLowerCase();
                        const isImg = /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(url);
                        if ((viewUser.licenseImagePath || viewUser.documentPath) && isImg) {
                          // eslint-disable-next-line @next/next/no-img-element
                          return <img src={(viewUser.licenseImagePath || viewUser.documentPath)!} alt="doc" className="max-h-full max-w-full object-contain" />;
                        }
                        if (viewUser.licenseImagePath || viewUser.documentPath) {
                          return (
                            <a className="text-primary underline" href={(viewUser.licenseImagePath || viewUser.documentPath)!} target="_blank" rel="noreferrer">عرض/تنزيل</a>
                          );
                        }
                        return <span className="text-xs text-muted-foreground">—</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {/* Right: textual fields */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">الاسم</Label>
                    <div className="font-medium">{viewUser.name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                    <div>{viewUser.email}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الهاتف</Label>
                    <div>{viewUser.phoneNumber}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الأدوار</Label>
                    <div>{(viewUser.roles || []).join(', ')}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الشركة</Label>
                    <div>{viewUser.companyName || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المدينة / الدولة</Label>
                    <div>{[viewUser.city, viewUser.country].filter(Boolean).join(' / ') || '—'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">العنوان</Label>
                    <div>{viewUser.address || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">رقم ضريبي</Label>
                    <div>{viewUser.taxNumber || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IBAN</Label>
                    <div dir="ltr">{viewUser.iban || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">بداية السجل</Label>
                    <div>{viewUser.registryStart || '—'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نهاية السجل</Label>
                    <div>{viewUser.registryEnd || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
