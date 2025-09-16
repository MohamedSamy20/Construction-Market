import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { getAdminOption, setAdminOption } from '@/services/admin';
import { toastError, toastSuccess } from '../../utils/alerts';

type Labeled = { id: string; en?: string; ar?: string };
type Accessory = { id: string; en?: string; ar?: string; price?: number };
type Dimensions = { width?: boolean; height?: boolean; length?: boolean };
type ProductCfg = {
  id: string;
  en?: string; ar?: string;
  dimensions?: Dimensions;
  basePricePerM2?: number;
  subtypes?: Labeled[];
  materials?: Labeled[];
  colors?: Labeled[];
  accessories?: Accessory[];
};

type Catalog = { products: ProductCfg[] };

export default function AdminProjectOptions({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProductCfg[]>([]);

  // Draft inputs for adding items
  const [newProduct, setNewProduct] = React.useState<ProductCfg>({ id: '', en: '', ar: '', dimensions: { width: true, height: true }, basePricePerM2: 0, subtypes: [], materials: [], colors: [], accessories: [] });
  // New-product inline collections
  const [npSubtypes, setNpSubtypes] = React.useState<Labeled[]>([]);
  const [npMaterials, setNpMaterials] = React.useState<Labeled[]>([]);
  const [npColors, setNpColors] = React.useState<Labeled[]>([]);
  const [npAccessories, setNpAccessories] = React.useState<Accessory[]>([]);
  const [npDraftSubtype, setNpDraftSubtype] = React.useState<Labeled>({ id: '', ar: '', en: '' });
  const [npDraftMaterial, setNpDraftMaterial] = React.useState<Labeled>({ id: '', ar: '', en: '' });
  const [npDraftColor, setNpDraftColor] = React.useState<Labeled>({ id: '', ar: '', en: '' });
  const [npDraftAccessory, setNpDraftAccessory] = React.useState<Accessory>({ id: '', ar: '', en: '', price: 0 });
  const [draftSubtype, setDraftSubtype] = React.useState<{ [pid: string]: Labeled }>({});
  const [draftMaterial, setDraftMaterial] = React.useState<{ [pid: string]: Labeled }>({});
  const [draftColor, setDraftColor] = React.useState<{ [pid: string]: Labeled }>({});
  const [draftAccessory, setDraftAccessory] = React.useState<{ [pid: string]: Accessory }>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer unified catalog key
        const catalogRes = await getAdminOption('project_catalog');
        if (catalogRes.ok && catalogRes.data) {
          try {
            const val = JSON.parse((catalogRes.data as any).value || '{}');
            if (!cancelled && val && Array.isArray(val.products)) {
              setProducts(val.products as ProductCfg[]);
              setLoading(false);
              return;
            }
          } catch {}
        }
        // Fallback: build from legacy keys
        const [types, mats, rules] = await Promise.all([
          getAdminOption('project_types'),
          getAdminOption('project_materials'),
          getAdminOption('project_price_rules'),
        ]);
        const typeArr: Labeled[] = (() => { try { const v = JSON.parse((types.data as any)?.value || '[]'); if (Array.isArray(v)) return v.map((x:any)=> typeof x==='string'? {id:x}:{id:String(x.id||x.value||''), en:x.en, ar:x.ar}).filter((x:any)=>x.id); } catch{} return []; })();
        const matArr: Labeled[] = (() => { try { const v = JSON.parse((mats.data as any)?.value || '[]'); if (Array.isArray(v)) return v.map((x:any)=> typeof x==='string'? {id:x}:{id:String(x.id||x.value||''), en:x.en, ar:x.ar}).filter((x:any)=>x.id); } catch{} return []; })();
        const priceRules: Record<string, number> = (() => { try { const v = JSON.parse((rules.data as any)?.value || '{}'); if (v && typeof v==='object') return v; } catch{} return {}; })();
        const built: ProductCfg[] = typeArr.map(t => ({ id: t.id, en: t.en, ar: t.ar, dimensions: { width: true, height: true }, basePricePerM2: Number(priceRules[t.id]||0), subtypes: [], materials: matArr, colors: [], accessories: [] }));
        if (!cancelled) setProducts(built);
      } catch {
        if (!cancelled) toastError(isAr ? 'تعذر تحميل الإعدادات' : 'Failed to load options', isAr);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isAr]);

  const slugify = (s: string) => {
    return String(s || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  };
  const norm = (s?: string) => String(s || '').trim().toLowerCase();

  const saveAll = async () => {
    try {
      const catalog: Catalog = { products };
      const r = await setAdminOption('project_catalog', catalog);
      // Also sync legacy keys for compatibility with current builder
      const types = products.map(p => ({ id: p.id, en: p.en, ar: p.ar }));
      const materials = Array.from(new Set(products.flatMap(p => (p.materials||[]).map(m=>m.id))))
        .map(id => ({ id, en: products.find(p=> (p.materials||[]).some(m=>m.id===id))?.materials?.find(m=>m.id===id)?.en, ar: products.find(p=> (p.materials||[]).some(m=>m.id===id))?.materials?.find(m=>m.id===id)?.ar }));
      const priceRules: Record<string, number> = {};
      products.forEach(p => { if (Number.isFinite(p.basePricePerM2||0)) priceRules[p.id] = Number(p.basePricePerM2||0); });
      await Promise.all([
        setAdminOption('project_types', types),
        setAdminOption('project_materials', materials),
        setAdminOption('project_price_rules', priceRules),
      ]);
      if (r.ok) {
        // Re-fetch to verify persistence and refresh local state
        const verify = await getAdminOption('project_catalog');
        try {
          const val = JSON.parse((verify.data as any)?.value || '{}');
          if (val && Array.isArray(val.products)) {
            setProducts(val.products as ProductCfg[]);
            toastSuccess(isAr ? 'تم الحفظ' : 'Saved', isAr);
          } else {
            toastError(isAr ? 'تم الحفظ، لكن لم يتم التحقق من البيانات' : 'Saved, but verification failed', isAr);
          }
        } catch {
          toastError(isAr ? 'تم الحفظ، لكن لم يتم التحقق من البيانات' : 'Saved, but verification failed', isAr);
        }
      } else {
        toastError(isAr ? 'فشل الحفظ' : 'Save failed', isAr);
      }
    } catch {
      toastError(isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save', isAr);
    }
  };

  const updateProduct = (idx: number, patch: Partial<ProductCfg>) => {
    setProducts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeProduct = (idx: number) => setProducts(prev => prev.filter((_,i)=>i!==idx));

  const addProduct = () => {
    // Auto-generate ID from AR/EN name
    const baseName = newProduct.en?.trim() || newProduct.ar?.trim() || '';
    if (!baseName) { toastError(isAr? 'أدخل اسم المنتج':'Enter product name', isAr); return; }
    if (!(Number(newProduct.basePricePerM2) > 0)) { toastError(isAr? 'أدخل سعرًا صحيحًا للمتر':'Enter a valid base price per m²', isAr); return; }
    const hasAnyDim = !!newProduct.dimensions?.width || !!newProduct.dimensions?.height || !!newProduct.dimensions?.length;
    if (!hasAnyDim) { toastError(isAr? 'اختر بُعدًا واحدًا على الأقل (عرض/ارتفاع/طول)':'Select at least one dimension (width/height/length)', isAr); return; }
    const existing = new Set(products.map(p => p.id));
    let id = slugify(baseName);
    if (!id) id = `prod-${products.length+1}`;
    let i = 1;
    let unique = id;
    while (existing.has(unique)) { unique = `${id}-${i++}`; }
    setProducts(prev => [...prev, { ...newProduct, id: unique, subtypes: [...npSubtypes], materials: [...npMaterials], colors: [...npColors], accessories: [...npAccessories] }]);
    setNewProduct({ id: '', en: '', ar: '', dimensions: { width: true, height: true }, basePricePerM2: 0, subtypes: [], materials: [], colors: [], accessories: [] });
    setNpSubtypes([]); setNpMaterials([]); setNpColors([]); setNpAccessories([]);
    setNpDraftSubtype({ id: '', ar: '', en: '' }); setNpDraftMaterial({ id: '', ar: '', en: '' }); setNpDraftColor({ id: '', ar: '', en: '' }); setNpDraftAccessory({ id: '', price: 0 });
  };

  const addLabeled = (pid: string, kind: 'subtypes'|'materials'|'colors', item: Labeled) => {
    if (!item.id) return;
    setProducts(prev => prev.map(p => p.id!==pid ? p : { ...p, [kind]: [ ...(p[kind] as Labeled[] || []), { id: item.id.trim(), en: item.en, ar: item.ar } ] }));
    // autosave after add for existing products
    setTimeout(() => { saveAll(); }, 0);
  };
  const delLabeled = (pid: string, kind: 'subtypes'|'materials'|'colors', id: string) => {
    setProducts(prev => prev.map(p => p.id!==pid ? p : { ...p, [kind]: (p[kind] as Labeled[] || []).filter(x=>x.id!==id) }));
    // autosave after removal for existing products
    setTimeout(() => { saveAll(); }, 0);
  };
  const addAccessory = (pid: string, acc: Accessory) => {
    const name = (acc.ar || acc.en || '').trim();
    if (!name) return;
    const prod = products.find(x => x.id === pid);
    const genId = slugify(acc.en || acc.ar || '');
    const id = genId || `acc-${((prod?.accessories||[]).length)+1}`;
    setProducts(prev => prev.map(p => p.id!==pid ? p : { ...p, accessories: [ ...(p.accessories||[]), { id, en: acc.en, ar: acc.ar, price: Number(acc.price||0) } ] }));
    setTimeout(() => { saveAll(); }, 0);
  };
  const delAccessory = (pid: string, id: string) => {
    setProducts(prev => prev.map(p => p.id!==pid ? p : { ...p, accessories: (p.accessories||[]).filter(x=>x.id!==id) }));
    setTimeout(() => { saveAll(); }, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...(rest as any)} />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'إعدادات كتالوج المشاريع' : 'Project Catalog Settings'}</h1>
          <p className="text-muted-foreground">{isAr ? 'إدارة المنتجات والأنواع الفرعية والخامات والألوان والملحقات وقواعد التسعير' : 'Manage products, subtypes, materials, colors, accessories and price rules'}</p>
        </div>

        {/* Add product */}
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'إضافة منتج' : 'Add Product'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs block mb-1">{isAr? 'الاسم (عربي)':'Name (Arabic)'}
                </label>
                <Input value={newProduct.ar} onChange={(e)=>setNewProduct(p=>({...p, ar: e.target.value}))} placeholder={isAr? 'باب':'باب'} />
              </div>
              <div>
                <label className="text-xs block mb-1">{isAr? 'الاسم (إنجليزي)':'Name (English)'}
                </label>
                <Input value={newProduct.en} onChange={(e)=>setNewProduct(p=>({...p, en: e.target.value}))} placeholder="Door" />
              </div>
              <div>
                <label className="text-xs block mb-1">{isAr? 'السعر للمتر المربع':'Base price per m²'}</label>
                <Input type="number" inputMode="decimal" value={Number(newProduct.basePricePerM2||0)} onChange={(e)=>setNewProduct(p=>({...p, basePricePerM2: Number(e.target.value||0)}))} />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-3 gap-3">
                <label className="text-xs col-span-3">{isAr? 'الأبعاد المطلوبة':'Required dimensions'}</label>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.width} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), width: e.target.checked }}))} /> <span>{isAr ? 'العرض' : 'Width'}</span></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.height} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), height: e.target.checked }}))} /> <span>{isAr ? 'الارتفاع' : 'Height'}</span></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.length} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), length: e.target.checked }}))} /> <span>{isAr ? 'الطول' : 'Length'}</span></div>
              </div>
            </div>

            {/* New product subtypes */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الأنواع الفرعية' : 'Subtypes'}</div>
              <div className="flex flex-wrap gap-2">
                {npSubtypes.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {isAr ? (s.ar || s.id) : (s.en || s.id)}
                    <button onClick={()=> setNpSubtypes(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftSubtype.ar || ''} onChange={(e)=> setNpDraftSubtype(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftSubtype.en || ''} onChange={(e)=> setNpDraftSubtype(prev => ({ ...prev, en: e.target.value }))} />
                <div className="col-span-1 md:col-span-1 flex items-end">
                  <Button size="sm" variant="outline" onClick={()=>{
                    const name = (npDraftSubtype.ar || npDraftSubtype.en || '').trim();
                    if (!name) return;
                    const id = slugify(npDraftSubtype.en || npDraftSubtype.ar || '');
                    setNpSubtypes(prev => [...prev, { id: id || `sub-${prev.length+1}` , ar: npDraftSubtype.ar, en: npDraftSubtype.en }]);
                    setNpDraftSubtype({ id: '', ar: '', en: '' });
                  }}>{isAr?'إضافة نوع':'Add subtype'}</Button>
                </div>
              </div>
            </div>

            {/* New product materials */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الخامات' : 'Materials'}</div>
              <div className="flex flex-wrap gap-2">
                {npMaterials.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {isAr ? (s.ar || s.id) : (s.en || s.id)}
                    <button onClick={()=> setNpMaterials(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftMaterial.ar || ''} onChange={(e)=> setNpDraftMaterial(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftMaterial.en || ''} onChange={(e)=> setNpDraftMaterial(prev => ({ ...prev, en: e.target.value }))} />
                <div className="col-span-1 md:col-span-1 flex items-end">
                  <Button size="sm" variant="outline" onClick={()=>{
                    const name = (npDraftMaterial.ar || npDraftMaterial.en || '').trim();
                    if (!name) return;
                    const id = slugify(npDraftMaterial.en || npDraftMaterial.ar || '');
                    setNpMaterials(prev => [...prev, { id: id || `mat-${prev.length+1}`, ar: npDraftMaterial.ar, en: npDraftMaterial.en }]);
                    setNpDraftMaterial({ id: '', ar: '', en: '' });
                  }}>{isAr?'إضافة خامة':'Add material'}</Button>
                </div>
              </div>
            </div>

            {/* New product colors */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الألوان' : 'Colors'}</div>
              <div className="flex flex-wrap gap-2">
                {npColors.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {isAr ? (s.ar || s.id) : (s.en || s.id)}
                    <button onClick={()=> setNpColors(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftColor.ar || ''} onChange={(e)=> setNpDraftColor(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftColor.en || ''} onChange={(e)=> setNpDraftColor(prev => ({ ...prev, en: e.target.value }))} />
                <div className="col-span-1 md:col-span-1 flex items-end">
                  <Button size="sm" variant="outline" onClick={()=>{
                    const name = (npDraftColor.ar || npDraftColor.en || '').trim();
                    if (!name) return;
                    // duplicate check (by AR or EN)
                    const exists = npColors.some(c => (npDraftColor.ar && norm(c.ar)===norm(npDraftColor.ar)) || (npDraftColor.en && norm(c.en)===norm(npDraftColor.en)) );
                    if (exists) { toastError(isAr? 'هذا اللون موجود بالفعل لهذا المنتج':'This color already exists for this product', isAr); return; }
                    const id = slugify(npDraftColor.en || npDraftColor.ar || '');
                    setNpColors(prev => [...prev, { id: id || `col-${prev.length+1}`, ar: npDraftColor.ar, en: npDraftColor.en }]);
                    setNpDraftColor({ id: '', ar: '', en: '' });
                  }}>{isAr?'إضافة لون':'Add color'}</Button>
                </div>
              </div>
            </div>

            {/* New product accessories */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الملحقات' : 'Accessories'}</div>
              <div className="flex flex-wrap gap-2">
                {npAccessories.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {(isAr ? (s.ar || s.id) : (s.en || s.id)) + (Number.isFinite(s.price as any) ? ` • ${Number(s.price||0)}` : '')}
                    <button onClick={()=> setNpAccessories(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftAccessory.ar || ''} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftAccessory.en || ''} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, en: e.target.value }))} />
                <Input placeholder={isAr?'السعر':'Price'} type="number" inputMode="decimal" value={Number(npDraftAccessory.price || 0)} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, price: Number(e.target.value || 0) }))} />
                <div className="col-span-1 md:col-span-3">
                  <Button size="sm" variant="outline" onClick={()=>{
                    const name = (npDraftAccessory.ar || npDraftAccessory.en || '').trim();
                    if (!name) return;
                    // duplicate check by AR/EN
                    const exists = npAccessories.some(a => (npDraftAccessory.ar && norm(a.ar)===norm(npDraftAccessory.ar)) || (npDraftAccessory.en && norm(a.en)===norm(npDraftAccessory.en)) );
                    if (exists) { toastError(isAr? 'هذا الملحق موجود بالفعل لهذا المنتج':'This accessory already exists for this product', isAr); return; }
                    const genId = slugify(npDraftAccessory.en || npDraftAccessory.ar || '');
                    setNpAccessories(prev => [...prev, { id: genId || `acc-${prev.length+1}`, ar: npDraftAccessory.ar, en: npDraftAccessory.en, price: Number(npDraftAccessory.price||0) }]);
                    setNpDraftAccessory({ id: '', ar: '', en: '', price: 0 });
                  }}>{isAr?'إضافة ملحق':'Add accessory'}</Button>
                </div>
              </div>
            </div>

            <div>
              <Button onClick={addProduct} disabled={loading}>{isAr ? 'إضافة' : 'Add'}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing products */}
        <div className="space-y-6">
          {products.map((p, idx) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>#{idx+1} — {p.ar || p.en || p.id}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{p.id}</Badge>
                    <Button variant="outline" onClick={()=>removeProduct(idx)}>{isAr ? 'حذف' : 'Remove'}</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs block mb-1">ID</label>
                    <Input value={p.id} readOnly disabled />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">{isAr? 'العربي':'Arabic'}</label>
                    <Input value={p.ar || ''} onChange={(e)=>updateProduct(idx, { ar: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">{isAr? 'الإنجليزي':'English'}</label>
                    <Input value={p.en || ''} onChange={(e)=>updateProduct(idx, { en: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">{isAr? 'السعر للمتر المربع':'Base price per m²'}</label>
                    <Input type="number" inputMode="decimal" value={Number(p.basePricePerM2 || 0)} onChange={(e)=>updateProduct(idx, { basePricePerM2: Number(e.target.value||0) })} />
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-3 gap-3">
                    <label className="text-xs col-span-3">{isAr? 'الأبعاد المطلوبة':'Required dimensions'}</label>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.width} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), width: e.target.checked } })} /> <span>{isAr ? 'العرض' : 'Width'}</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.height} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), height: e.target.checked } })} /> <span>{isAr ? 'الارتفاع' : 'Height'}</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.length} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), length: e.target.checked } })} /> <span>{isAr ? 'الطول' : 'Length'}</span></div>
                  </div>
                </div>

                {/* Subtypes */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الأنواع الفرعية' : 'Subtypes'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.subtypes||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {isAr ? (s.ar || s.id) : (s.en || s.id)}
                        <button className="text-xs" onClick={()=>delLabeled(p.id,'subtypes',s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftSubtype[p.id]?.ar || ''} onChange={(e)=>setDraftSubtype(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftSubtype[p.id]?.en || ''} onChange={(e)=>setDraftSubtype(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftSubtype[p.id]?.ar || '';
                        const en = draftSubtype[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        addLabeled(p.id, 'subtypes', { id: slugify(en || ar || '') || `sub-${(p.subtypes||[]).length+1}`, ar, en });
                        setDraftSubtype(d=>({ ...d, [p.id]: { id:'', ar:'', en:'' } }));
                      }}>{isAr?'إضافة نوع':'Add subtype'}</Button>
                    </div>
                  </div>
                </div>

                {/* Materials */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الخامات' : 'Materials'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.materials||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {isAr ? (s.ar || s.id) : (s.en || s.id)}
                        <button className="text-xs" onClick={()=>delLabeled(p.id,'materials',s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftMaterial[p.id]?.ar || ''} onChange={(e)=>setDraftMaterial(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftMaterial[p.id]?.en || ''} onChange={(e)=>setDraftMaterial(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftMaterial[p.id]?.ar || '';
                        const en = draftMaterial[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        addLabeled(p.id, 'materials', { id: slugify(en || ar || '') || `mat-${(p.materials||[]).length+1}`, ar, en });
                        setDraftMaterial(d=>({ ...d, [p.id]: { id:'', ar:'', en:'' } }));
                      }}>{isAr?'إضافة خامة':'Add material'}</Button>
                    </div>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الألوان' : 'Colors'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.colors||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {isAr ? (s.ar || s.id) : (s.en || s.id)}
                        <button className="text-xs" onClick={()=>delLabeled(p.id,'colors',s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftColor[p.id]?.ar || ''} onChange={(e)=>setDraftColor(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftColor[p.id]?.en || ''} onChange={(e)=>setDraftColor(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftColor[p.id]?.ar || '';
                        const en = draftColor[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        // duplicate check in existing product colors
                        const exists = (p.colors||[]).some(c => (ar && norm(c.ar)===norm(ar)) || (en && norm(c.en)===norm(en)) );
                        if (exists) { toastError(isAr? 'هذا اللون موجود بالفعل لهذا المنتج':'This color already exists for this product', isAr); return; }
                        addLabeled(p.id, 'colors', { id: slugify(en || ar || '') || `col-${(p.colors||[]).length+1}`, ar, en });
                        setDraftColor(d=>({ ...d, [p.id]: { id:'', ar:'', en:'' } }));
                        setTimeout(() => { saveAll(); }, 0);
                      }}>{isAr?'إضافة لون':'Add color'}</Button>
                    </div>
                  </div>
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الملحقات' : 'Accessories'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.accessories||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {(isAr ? (s.ar || s.id) : (s.en || s.id)) + (Number.isFinite(s.price as any) ? ` • ${Number(s.price||0)}` : '')}
                        <button className="text-xs" onClick={()=>delAccessory(p.id, s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftAccessory[p.id]?.ar || ''} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftAccessory[p.id]?.en || ''} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <Input placeholder={isAr?'السعر':'Price'} type="number" inputMode="decimal" value={Number(draftAccessory[p.id]?.price || 0)} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), price: Number(e.target.value||0) } }))} />
                    <div className="col-span-1 md:col-span-3">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftAccessory[p.id]?.ar || '';
                        const en = draftAccessory[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        // duplicate check in existing product accessories
                        const exists = (p.accessories||[]).some(a => (ar && norm(a.ar)===norm(ar)) || (en && norm(a.en)===norm(en)) );
                        if (exists) { toastError(isAr? 'هذا الملحق موجود بالفعل لهذا المنتج':'This accessory already exists for this product', isAr); return; }
                        const genId = slugify(draftAccessory[p.id]?.en || draftAccessory[p.id]?.ar || '');
                        const payload = { ...(draftAccessory[p.id] || {}), id: genId || `acc-${(p.accessories||[]).length+1}` } as Accessory;
                        addAccessory(p.id, payload);
                        setDraftAccessory(d=>({ ...d, [p.id]: {id:'',ar:'',en:'',price:0} }));
                      }}>{isAr?'إضافة ملحق':'Add accessory'}</Button>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={saveAll} disabled={loading}>{isAr ? 'حفظ كل الإعدادات' : 'Save All'}</Button>
          <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('admin-dashboard')}>{isAr ? 'رجوع' : 'Back'}</Button>
        </div>
      </div>
    </div>
  );
}
