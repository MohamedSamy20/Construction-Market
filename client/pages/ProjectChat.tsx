import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getProjectConversation, getProjectConversationByKeys, listProjectMessages, sendProjectMessage, createProjectConversation } from '@/services/projectChat';

export default function ProjectChat({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  const [projectId, setProjectId] = useState<number | null>(null);
  const [merchantId, setMerchantId] = useState<string>('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: number; from: string; text: string; ts: number }>>([]);
  const [text, setText] = useState<string>('');
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pid = Number(window.localStorage.getItem('project_chat_project_id') || '') || null;
    const mid = String(window.localStorage.getItem('project_chat_merchant_id') || '');
    const midName = String(window.localStorage.getItem('project_chat_merchant_name') || '');
    const cid = Number(window.localStorage.getItem('project_chat_conversation_id') || '') || null;
    setProjectId(pid);
    setMerchantId(mid);
    if (midName) setMerchantName(midName);
    (async () => {
      try {
        if (cid) {
          setConversationId(cid);
          return;
        }
        if (pid && mid) {
          // Try resolve existing
          try {
            const found = await getProjectConversationByKeys(pid, mid);
            if (found.ok && (found.data as any)?.id) {
              const id = Number((found.data as any).id);
              setConversationId(id);
              try { window.localStorage.setItem('project_chat_conversation_id', String(id)); } catch {}
              return;
            }
          } catch {}
          // Otherwise, create one
          try {
            const created = await createProjectConversation(pid, mid);
            if (created.ok && (created.data as any)?.id) {
              const id = Number((created.data as any).id);
              setConversationId(id);
              try { window.localStorage.setItem('project_chat_conversation_id', String(id)); } catch {}
              return;
            }
          } catch {}
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!conversationId) return;
        const c = await getProjectConversation(conversationId);
        if (c.ok && c.data) {
          setMerchantId((c.data as any).merchantId || merchantId);
          setMerchantName((c.data as any).merchantName || '');
          setCustomerId((c.data as any).customerId || customerId);
          setCustomerName((c.data as any).customerName || '');
        }
      } catch {}
    })();
  }, [conversationId]);

  // Poll messages
  useEffect(() => {
    let timer: any;
    (async () => {
      try {
        if (!conversationId) return;
        const r = await listProjectMessages(conversationId);
        if (r.ok && Array.isArray(r.data)) {
          const arr = (r.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
          setMessages(arr);
        }
      } catch {}
    })();
    if (conversationId) {
      timer = setInterval(async () => {
        try {
          const r = await listProjectMessages(conversationId);
          if (r.ok && Array.isArray(r.data)) {
            const arr = (r.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
        } catch {}
      }, 3500);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [conversationId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!text.trim() || !conversationId) return;
    (async () => {
      try {
        const r = await sendProjectMessage(conversationId, text.trim());
        if (r.ok) {
          const l = await listProjectMessages(conversationId);
          if (l.ok && Array.isArray(l.data)) {
            const arr = (l.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
          setText('');
        } else {
          alert(isAr ? 'تعذر إرسال الرسالة.' : 'Failed to send message.');
        }
      } catch {}
    })();
  };

  // Determine current user and role to render labels and bubble alignment correctly
  const role = String((context as any)?.user?.role || '').toLowerCase();
  const myId = String((context as any)?.user?.id || '');
  const isVendor = role === 'vendor' || role === 'merchant';

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header currentPage="project-chat" setCurrentPage={setCurrentPage as any} {...(context as any)} />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{isVendor ? (isAr ? 'مراسلة العميل' : 'Message Customer') : (isAr ? 'مراسلة التاجر' : 'Message Merchant')}</span>
              <div className="text-xs text-muted-foreground">
                {isVendor
                  ? (isAr ? `عميل: ${customerName || customerId} • مشروع: #${projectId ?? ''}` : `Customer: ${customerName || customerId} • Project: #${projectId ?? ''}`)
                  : (isAr ? `تاجر: ${merchantName || merchantId} • مشروع: #${projectId ?? ''}` : `Merchant: ${merchantName || merchantId} • Project: #${projectId ?? ''}`)
                }
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={boxRef} className="h-96 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {(!conversationId) ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'لا توجد محادثة محددة. حاول فتحها من تفاصيل المشروع.' : 'No conversation selected. Open it from project details.'}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'ابدأ المحادثة بإرسال رسالة.' : 'Start the conversation by sending a message.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={m.id ?? i} className={`flex ${m.from === myId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.from === myId ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                        <div>{m.text}</div>
                        <div className="text-[10px] opacity-70 mt-1">{new Date(m.ts).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={text} onChange={(e)=> setText(e.target.value)} placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'} onKeyDown={(e)=> { if (e.key==='Enter') send(); }} />
              <Button onClick={send} disabled={!text.trim()}>{isAr ? 'إرسال' : 'Send'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
