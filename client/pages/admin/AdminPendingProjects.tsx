import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { getPendingProjects, approveProject, rejectProject } from '@/services/admin';
import { toastError, toastSuccess } from '../../utils/alerts';

export default function AdminPendingProjects({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const [items, setItems] = React.useState<Array<{ id: number; title: string; description?: string; customerId: string; customerName?: string; categoryId: number; createdAt: string }>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPendingProjects();
      if (r.ok && r.data && Array.isArray((r.data as any).items)) setItems((r.data as any).items);
      else setItems([]);
    } catch {
      setItems([]);
      toastError(isAr ? 'تعذر جلب المشاريع' : 'Failed to fetch projects', isAr);
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => { void load(); }, [load]);

  const doApprove = async (id: number, state: 'Published'|'InBidding') => {
    try {
      const r = await approveProject(id, state);
      if (r.ok) { toastSuccess(isAr ? 'تم الاعتماد' : 'Approved', isAr); await load(); }
      else toastError(isAr ? 'فشل الاعتماد' : 'Approval failed', isAr);
    } catch { toastError(isAr ? 'فشل الاعتماد' : 'Approval failed', isAr); }
  };
  const doReject = async (id: number) => {
    try {
      const r = await rejectProject(id, '');
      if (r.ok) { toastSuccess(isAr ? 'تم الرفض' : 'Rejected', isAr); await load(); }
      else toastError(isAr ? 'فشل الرفض' : 'Rejection failed', isAr);
    } catch { toastError(isAr ? 'فشل الرفض' : 'Rejection failed', isAr); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...(rest as any)} />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{isAr ? 'المشاريع قيد الاعتماد' : 'Pending Projects'}</h1>
          <p className="text-muted-foreground">{isAr ? 'راجع واعتمد أو ارفض طلبات المشاريع' : 'Review and approve or reject project requests'}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'قائمة المشاريع' : 'Projects List'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground">{loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'لا توجد مشاريع قيد الاعتماد' : 'No pending projects')}</div>
            )}
            {items.map((p) => (
              <div key={p.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="secondary">#{p.id}</Badge>
                    {p.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {isAr ? 'تم الإنشاء: ' : 'Created: '}{new Date(p.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-xl mt-1">{(p.description || '').slice(0, 160)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{isAr ? 'العميل' : 'Customer'}: {p.customerName || p.customerId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={()=>{ try { if (typeof window !== 'undefined') localStorage.setItem('selected_project_id', String(p.id)); } catch {} ; setCurrentPage && setCurrentPage('project-details'); }}>
                    {isAr ? 'عرض التفاصيل' : 'View Details'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={()=>doApprove(p.id, 'Published')}>{isAr ? 'اعتماد (نشر)' : 'Approve (Publish)'}</Button>
                  <Button size="sm" variant="outline" onClick={()=>doReject(p.id)}>{isAr ? 'رفض' : 'Reject'}</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('admin-dashboard')}>{isAr ? 'رجوع' : 'Back'}</Button>
        </div>
      </div>
    </div>
  );
}
