import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Header from "../components/Header";
import type { RouteContext } from "../components/Router";
import { Bell } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

export default function NotificationsPage(context: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('app_notifications');
      let list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        const currentUserId = (context as any)?.user?.id;
        const currentRole = (context as any)?.user?.role;
        // role-based filtering
        if (currentRole === 'admin') {
          // admins see all
          // no filter
        } else if (currentRole === 'vendor') {
          list = list.filter((n:any)=> n.recipientRole === 'vendor' && n.recipientId && n.recipientId === currentUserId);
        } else {
          // normal users (customers) see only their notifications (recipientRole user or undefined for backward compat)
          list = list.filter((n:any)=> (!!n.recipientId && n.recipientId === currentUserId) && (n.recipientRole === undefined || n.recipientRole === 'user'));
        }
        // sort newest first
        list.sort((a:any,b:any)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
        setItems(list);
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {locale === 'ar' ? 'التنبيهات' : 'Notifications'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="p-4 border rounded-lg text-sm text-muted-foreground">
                {locale === 'ar' ? 'لا توجد تنبيهات بعد.' : 'No notifications yet.'}
              </div>
            ) : (
              items.map((n:any) => (
                <div key={n.id} className="p-4 border rounded-lg">
                  <div className="font-medium">{n.title}</div>
                  {!!n.desc && <div className="text-sm text-muted-foreground">{n.desc}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{(() => { const numLocale = locale==='ar' ? 'ar-EG' : 'en-US'; return new Date(n.createdAt || Date.now()).toLocaleString(numLocale); })()}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
