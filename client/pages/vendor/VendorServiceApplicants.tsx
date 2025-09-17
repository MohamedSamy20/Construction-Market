import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import type { RouteContext } from "../../components/routerTypes";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { listVendorServices } from "@/services/servicesCatalog";
import { createConversation, getConversationByKeys } from "@/services/chat";
import { listOffersForService, updateOfferStatus, type OfferDto } from "@/services/offers";
import Swal from "sweetalert2";

interface Props extends Partial<RouteContext> {}

export default function VendorServiceApplicants({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const currency = isAr ? "ر.س" : "SAR";
  const vendorId = (context as any)?.user?.id || null;

  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<Record<string, OfferDto[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await listVendorServices({ vendorId: 'me' });
        if (!ok || !Array.isArray(data)) { if (!cancelled) { setServices([]); setRequests({}); } return; }
        if (cancelled) return;
        setServices(data as any[]);
        // Fetch offers for each service
        const entries = await Promise.all(
          (data as any[]).map(async (s:any) => {
            try {
              const r = await listOffersForService(String(s.id));
              return [String(s.id), (r.ok && Array.isArray(r.data) ? r.data as OfferDto[] : [])] as [string, OfferDto[]];
            } catch { return [String(s.id), []] as [string, OfferDto[]]; }
          })
        );
        if (!cancelled) setRequests(Object.fromEntries(entries));
      } catch {
        if (!cancelled) { setServices([]); setRequests({}); }
      }
    })();
    return () => { cancelled = true; };
  }, [vendorId]);

  const techName = (id: any) => `#${id}`;

  const labelForServiceType = (id?: string) => {
    const map: any = {
      plumber: { ar: "سباك", en: "Plumber" },
      electrician: { ar: "كهربائي", en: "Electrician" },
      carpenter: { ar: "نجار", en: "Carpenter" },
      painter: { ar: "نقاش", en: "Painter" },
      gypsum_installer: { ar: "فني تركيب جيبس بورد", en: "Gypsum Board Installer" },
      marble_installer: { ar: "فني تركيب رخام", en: "Marble Installer" },
    };
    if (!id) return isAr ? 'خدمة' : 'Service';
    return map[id]?.[isAr ? 'ar' : 'en'] || id;
  };

  // Flatten my requests for checks
  const myRequests = useMemo(() => {
    const all: OfferDto[] = [];
    for (const key of Object.keys(requests)) {
      const list = requests[key] || [];
      for (const r of list) all.push(r);
    }
    return all;
  }, [requests]);

  const updateStatus = async (reqId: string, status: 'accepted' | 'rejected') => {
    const confirmText = status === 'accepted' ? (isAr ? 'قبول هذا المتقدم؟' : 'Accept this applicant?') : (isAr ? 'رفض هذا المتقدم؟' : 'Reject this applicant?');
    const ok = await Swal.fire({ title: confirmText, icon: 'question', showCancelButton: true, confirmButtonText: isAr ? 'تأكيد' : 'Confirm', cancelButtonText: isAr ? 'إلغاء' : 'Cancel' });
    if (!ok.isConfirmed) return;
    try {
      const res = await updateOfferStatus(reqId, status);
      if (res.ok) {
        // Refresh the service offers containing this request
        const affectedServiceId = res.data?.serviceId ?? myRequests.find(r=> String(r.id)===String(reqId))?.serviceId;
        if (affectedServiceId) {
          try {
            const r = await listOffersForService(String(affectedServiceId));
            setRequests(prev => ({ ...prev, [String(affectedServiceId)]: (r.ok && Array.isArray(r.data) ? r.data as OfferDto[] : []) }));
          } catch {}
        }
        Swal.fire({ icon: 'success', title: status==='accepted' ? (isAr ? 'تم القبول' : 'Accepted') : (isAr ? 'تم الرفض' : 'Rejected'), timer: 1200, showConfirmButton: false });
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{isAr ? 'المتقدمون على الخدمات' : 'Service Applicants'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('vendor-services')}>
              {isAr ? 'خدماتي' : 'My Services'}
            </Button>
            <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('vendor-dashboard')}>
              {isAr ? 'لوحة التاجر' : 'Vendor Dashboard'}
            </Button>
          </div>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? 'لا توجد خدمات لعرض المتقدمين عليها.' : 'You have no services to show applicants for.'}
            </CardContent>
          </Card>
        ) : myRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? 'لا يوجد متقدمون حالياً.' : 'No applicants yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {services.map((s:any) => {
              const list = requests[String(s.id)] || [];
              if (list.length === 0) return null;
              return (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{labelForServiceType(s.type)}</span>
                      {typeof s.days !== 'undefined' && (
                        <Badge variant="secondary">{isAr ? `${Number(s.days||0)} يوم` : `${Number(s.days||0)} days`}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {list.map((r:OfferDto) => (
                        <div key={r.id} className="rounded border p-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <span>{techName(r.technicianId)}</span>
                              {r.status && (
                                <Badge variant="secondary" className={`text-[10px] ${r.status==='accepted' ? 'bg-green-100 text-green-700' : r.status==='rejected' ? 'bg-red-100 text-red-700' : ''}`}>
                                  {r.status==='accepted' ? (isAr ? 'مقبول' : 'Accepted') : r.status==='rejected' ? (isAr ? 'مرفوض' : 'Rejected') : (isAr ? 'قيد الانتظار' : 'Pending')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {currency} {Number(r.price||0).toLocaleString(isAr?'ar-EG':'en-US')} • {isAr ? `${Number(r.days||0)} يوم` : `${Number(r.days||0)} days`}
                            </div>
                          </div>
                          {!!r.message && (
                            <div className="text-xs text-muted-foreground mt-1">{r.message}</div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-[10px] text-muted-foreground">
                              {isAr ? 'تاريخ' : 'Date'}: {r.createdAt ? new Date(r.createdAt).toLocaleString(isAr?'ar-EG':'en-US') : '-'}
                            </div>
                            <div className="flex gap-2">
                              {r.status !== 'accepted' && (
                                <Button size="sm" onClick={()=> updateStatus(r.id, 'accepted')}>
                                  {isAr ? 'قبول' : 'Accept'}
                                </Button>
                              )}
                              {r.status !== 'rejected' && (
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={()=> updateStatus(r.id, 'rejected')}>
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async ()=> {
                                  try {
                                    const sid = String(s.id);
                                    const tid = String(r.technicianId);
                                    // Try get conversation by keys, otherwise create
                                    let convId: string | null = null;
                                    try {
                                      const found = await getConversationByKeys(sid, tid);
                                      if (found.ok && (found.data as any)?.id) convId = String((found.data as any).id);
                                    } catch {}
                                    if (!convId) {
                                      const cr = await createConversation(sid, tid);
                                      if (cr.ok && (cr.data as any)?.id) convId = String((cr.data as any).id);
                                    }
                                    if (convId) {
                                      try { window.localStorage.setItem('chat_conversation_id', convId); } catch {}
                                      try { window.localStorage.setItem('chat_technician_id', tid); } catch {}
                                      try { window.localStorage.setItem('chat_service_id', sid); } catch {}
                                      setCurrentPage && setCurrentPage('vendor-chat');
                                    }
                                  } catch {}
                                }}
                              >
                                {isAr ? 'مراسلة' : 'Message'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
