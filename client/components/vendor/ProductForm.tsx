import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getAdminProductOptions } from '../../lib/adminOptions';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getCommissionRates } from '@/services/commissions';
import { toastError } from '../../utils/alerts';
// removed brand list; brand field not used for vendor form

interface ProductFormProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
  categories?: Array<{ id: number | string; name: string }>; // from backend
}

export default function ProductForm({ product, onSave, onCancel, categories = [] }: ProductFormProps) {
  const adminCategories = getAdminProductOptions().categories;
  // Do NOT use fallback IDs for backend submission; require real categories from server
  const categoryList: Array<{ id: number | string; name: string }> = Array.isArray(categories) ? categories : [];
  const [formData, setFormData] = useState({
    // Localized fields
    nameAr: product?.nameAr || product?.name || '',
    nameEn: product?.nameEn || '',
    // Backend category id
    categoryId: (product?.categoryId ?? (categoryList[0]?.id ?? '')) as number | string,
    subCategoryAr: (product as any)?.subCategoryAr || (typeof (product as any)?.subCategory === 'string' ? (product as any)?.subCategory : (product as any)?.subCategory?.ar) || '',
    subCategoryEn: (product as any)?.subCategoryEn || (typeof (product as any)?.subCategory === 'string' ? (product as any)?.subCategory : (product as any)?.subCategory?.en) || '',
    price: product?.price ?? '',
    originalPrice: product?.originalPrice ?? '',
    stock: product?.stock ?? 0,
    inStock: product?.inStock ?? (Number(product?.stock ?? 0) > 0),
    partNumber: product?.partNumber || '',
    // Part location (A/B/C)
    partLocation: (product as any)?.partLocation || '',
    // Localized descriptions
    descriptionAr: product?.descriptionAr || '',
    descriptionEn: product?.descriptionEn || '',
    image: product?.image || '',
    images: (product as any)?.images || (product?.image ? [product.image] : []),
    _files: [] as File[],
    isNew: product?.isNew || false,
    isOnSale: product?.isOnSale || false,
    isActive: product?.isActive || product?.status === 'active' || false,
    // Product details tabs data
    specificationsEntries: Object.entries(((product as any)?.specifications) || {}).map(([key, value]: [string, any]) => ({
      key,
      value: typeof value === 'object' && value !== null ? (value.ar ?? value.en ?? String(value)) : String(value)
    })),
    compatibilityList: Array.isArray((product as any)?.compatibility)
      ? ((product as any)?.compatibility as any[]).map((c: any) => (typeof c === 'object' && c !== null ? (c.ar ?? c.en ?? '') : String(c)))
      : [],
    // Vendor-defined installation option
    addonInstallEnabled: product?.addonInstallEnabled || (product as any)?.addonInstallation?.enabled || false,
    addonInstallFee: (product?.addonInstallFee ?? (product as any)?.addonInstallation?.feePerUnit) ?? 50,
    ...product
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Commission preview from backend
  const [commissionPct, setCommissionPct] = useState<number>(10);
  const [currency, setCurrency] = useState<string>('SAR');
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getCommissionRates();
        if (ok && (data as any)?.rates) {
          setCommissionPct(Number((data as any).rates.products || 10));
          setCurrency(String((data as any).rates.currency || 'SAR'));
        }
      } catch {}
    })();
  }, []);
  const pricePreview = Number(String(formData.price || '').replace(/[^0-9]/g, '')) || 0;
  const commissionAmount = Math.round(pricePreview * (commissionPct / 100));
  const netAmount = Math.max(pricePreview - commissionAmount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate categoryId: must be a valid Mongo ObjectId (24 hex chars)
    const catId = String(formData.categoryId || '');
    if (!/^[a-fA-F0-9]{24}$/.test(catId)) {
      toastError('الرجاء اختيار فئة صحيحة من قائمة الفئات (يجب تحميل الفئات من الخادم أولاً)', true);
      return;
    }
    const priceNum = Number(String(formData.price || '').replace(/[^0-9]/g, '')) || 0;
    const originalPriceNum = Number(String(formData.originalPrice || '').replace(/[^0-9]/g, '')) || 0;
    const stockNum = Number(String(formData.stock || '').replace(/[^0-9]/g, '')) || 0;
    // ensure main image is first in images array
    const imgs: string[] = Array.isArray((formData as any).images) ? (formData as any).images : [];
    const main = formData.image || imgs[0] || '';
    const uniqueImages = Array.from(new Set([main, ...imgs.filter(Boolean)]));
    // normalize specs and compatibility
    const specsObj = Array.isArray((formData as any).specificationsEntries)
      ? (formData as any).specificationsEntries.reduce((acc: Record<string, string>, item: any) => {
          const k = String(item?.key || '').trim();
          if (k) acc[k] = String(item?.value ?? '');
          return acc;
        }, {})
      : {};
    const compatibilityArr = Array.isArray((formData as any).compatibilityList)
      ? (formData as any).compatibilityList.map((s: any) => String(s || '').trim()).filter(Boolean)
      : [];
    onSave({
      ...formData,
      price: priceNum,
      originalPrice: originalPriceNum,
      stock: stockNum,
      inStock: stockNum > 0,
      image: main,
      images: uniqueImages,
      subCategory: { ar: formData.subCategoryAr || '', en: formData.subCategoryEn || '' },
      status: formData.isActive ? 'active' : 'draft',
      specifications: specsObj,
      compatibility: compatibilityArr,
      partLocation: (formData as any)?.partLocation || '',
      // normalize addon object as well
      addonInstallation: { enabled: !!formData.addonInstallEnabled, feePerUnit: Number(formData.addonInstallFee || 0) },
      id: product?.id || Date.now().toString()
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-900 border shadow-xl">
      <DialogHeader>
        <DialogTitle>
          {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nameAr">اسم المنتج (عربي)</Label>
            <Input id="nameAr" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="nameEn">اسم المنتج (إنجليزي)</Label>
            <Input id="nameEn" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} required />
          </div>

          {/* Brand removed per request */}

          <div>
            <Label htmlFor="categoryId">الفئة</Label>
            <Select value={String(formData.categoryId ?? '')}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              disabled={!categoryList.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((c) => (
                  <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!categoryList.length && (
              <p className="mt-1 text-xs text-muted-foreground">يرجى الانتظار لحين تحميل الفئات من الخادم، ثم اختر فئة قبل الإرسال.</p>
            )}
          </div>

          <div>
            <Label htmlFor="subCategoryAr">النوع الفرعي (عربي)</Label>
            <Input id="subCategoryAr" value={formData.subCategoryAr} onChange={(e) => setFormData({ ...formData, subCategoryAr: e.target.value })} placeholder="مثال: باب خشبي / شباك الوميتال" />
          </div>
          <div>
            <Label htmlFor="subCategoryEn">النوع الفرعي (إنجليزي)</Label>
            <Input id="subCategoryEn" value={formData.subCategoryEn} onChange={(e) => setFormData({ ...formData, subCategoryEn: e.target.value })} placeholder="e.g., Wooden Door / Aluminum Window" />
          </div>

          {/* Part location - free text input */}
          <div className="md:col-span-2">
            <Label htmlFor="partLocation" className="block mb-2">مكان القطعة</Label>
            <Input
              id="partLocation"
              placeholder="مثال: يمين أمامي / يسار خلفي / أمام السيارة ..."
              value={(formData as any)?.partLocation || ''}
              onChange={(e) => setFormData({ ...formData, partLocation: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="price">السعر الحالي</Label>
            <Input id="price" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.price} onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, price: v });
            }} required />
            <div className="mt-1 text-xs text-muted-foreground">
              <div>عمولتنا {commissionPct}%: {commissionAmount.toLocaleString('ar-EG')} {currency === 'SAR' ? 'ريال' : currency}</div>
              <div>الصافي بعد الخصم: {netAmount.toLocaleString('ar-EG')} {currency === 'SAR' ? 'ريال' : currency}</div>
            </div>
          </div>
          <div>
            <Label htmlFor="originalPrice">السعر الأصلي (اختياري)</Label>
            <Input id="originalPrice" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.originalPrice} onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, originalPrice: v });
            }} />
          </div>
          <div>
            <Label htmlFor="stock">الكمية المتوفرة</Label>
            <Input id="stock" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.stock} onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              const n = v === '' ? 0 : parseInt(v);
              setFormData({ ...formData, stock: v, inStock: n > 0 });
            }} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="imageFile">الصور / المستندات</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div>
                <Label htmlFor="imageFile" className="text-sm text-muted-foreground">ارفع صور أو مستندات من جهازك</Label>
                {/* Transparent input over the button to ensure native picker opens reliably */}
                <div className="relative inline-block">
                  <Input
                    ref={fileInputRef}
                    id="imageFile"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const readers = files.map((file) => new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(String(r.result || ''));
                    r.readAsDataURL(file);
                  }));
                  Promise.all(readers).then((base64s) => {
                    const newImages = [...(formData.images as string[] || []), ...base64s];
                    const main = formData.image || base64s[0] || '';
                    setFormData({ ...formData, image: main, images: newImages, _files: [...(formData as any)._files || [], ...files] });
                    // لا نمسح قيمة الـ input هنا حتى لا يظهر "no file selected" عند بعض المتصفحات
                  });
                    }}
                  />
                  <Button type="button" variant="outline">اختيار صور</Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {(formData.images as string[]).length > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                      {(formData.images as string[]).length} صورة محددة
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">لا توجد صور محددة</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">الصورة الرئيسية (ستظهر في القائمة والتفاصيل)</Label>
                <div className="mt-2 w-full h-44 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {formData.image ? (
                    <img src={formData.image} alt="preview" className="max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">لا توجد صورة بعد</span>
                  )}
                </div>
              </div>
            </div>
            {/* Close the two-column grid inside the images section before thumbnails */}
            </div>
            {/* Thumbnails */}
            <div className="mt-3">
              <Label className="text-sm text-muted-foreground">صور إضافية</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(formData.images as string[] || []).map((src, idx) => (
                  <div key={idx} className={`relative w-16 h-16 border rounded overflow-hidden bg-white dark:bg-gray-800 ${formData.image===src ? 'ring-2 ring-primary' : ''}`}>
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 z-10 bg-white/90 dark:bg-gray-900/90 border rounded-full p-0.5 shadow"
                      aria-label="حذف الصورة"
                      title="حذف الصورة"
                      onClick={() => {
                        const arr = [...(formData.images as string[] || [])];
                        arr.splice(idx, 1);
                        const isMain = formData.image === src;
                        const newMain = isMain ? (arr[0] || '') : formData.image;
                        // Also remove corresponding file if it exists (best-effort by index)
                        const files = [ ...((formData as any)._files || []) ];
                        if (files[idx]) files.splice(idx, 1);
                        setFormData({ ...formData, images: arr, image: newMain, _files: files });
                        // clear native input value (UI label is custom)
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                    <button
                      type="button"
                      className="w-full h-full flex items-center justify-center"
                      onClick={() => setFormData({ ...formData, image: src })}
                      title={formData.image===src ? 'الصورة الرئيسية' : 'تعيين كصورة رئيسية'}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`thumb-${idx}`} className="max-h-full object-contain" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="descriptionAr">الوصف (عربي)</Label>
          <Textarea id="descriptionAr" value={formData.descriptionAr} onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} rows={4} />
        </div>
        <div>
          <Label htmlFor="descriptionEn">الوصف (إنجليزي)</Label>
          <Textarea id="descriptionEn" value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} rows={4} />
        </div>
      </div>

      {/* Specifications (key-value) */}
      <div className="space-y-3">
        <Label>المواصفات</Label>
        <div className="space-y-2">
          {((formData as any).specificationsEntries as Array<{ key: string; value: string }>)?.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="md:col-span-2">
                <Input
                  placeholder="العنوان (مثال: رقم القطعة)"
                  value={row.key}
                  onChange={(e) => {
                    const arr = [ ...((formData as any).specificationsEntries || []) ];
                    arr[idx] = { ...arr[idx], key: e.target.value };
                    setFormData({ ...formData, specificationsEntries: arr });
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  placeholder="القيمة (مثال: TOY-OF-2015)"
                  value={row.value}
                  onChange={(e) => {
                    const arr = [ ...((formData as any).specificationsEntries || []) ];
                    arr[idx] = { ...arr[idx], value: e.target.value };
                    setFormData({ ...formData, specificationsEntries: arr });
                  }}
                />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <Button type="button" variant="destructive" size="sm" onClick={() => {
                  const arr = [ ...((formData as any).specificationsEntries || []) ];
                  arr.splice(idx, 1);
                  setFormData({ ...formData, specificationsEntries: arr });
                }}>
                  حذف السطر
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFormData({
            ...formData,
            specificationsEntries: [ ...((formData as any).specificationsEntries || []), { key: '', value: '' } ]
          })}
        >
          إضافة مواصفة
        </Button>
      </div>

      {/* Compatibility list */}
      <div className="space-y-3">
        <Label>التوافق</Label>
        <div className="space-y-2">
          {((formData as any).compatibilityList as string[])?.map((val, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="md:col-span-4">
                <Input
                  placeholder="مثال: تويوتا كامري 2015-2022"
                  value={val}
                  onChange={(e) => {
                    const arr = [ ...((formData as any).compatibilityList || []) ];
                    arr[idx] = e.target.value;
                    setFormData({ ...formData, compatibilityList: arr });
                  }}
                />
              </div>
              <div className="md:col-span-1 flex">
                <Button type="button" variant="destructive" size="sm" className="w-full" onClick={() => {
                  const arr = [ ...((formData as any).compatibilityList || []) ];
                  arr.splice(idx, 1);
                  setFormData({ ...formData, compatibilityList: arr });
                }}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFormData({
            ...formData,
            compatibilityList: [ ...((formData as any).compatibilityList || []), '' ]
          })}
        >
          إضافة سطر توافق
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })} />
          <Label htmlFor="isActive">نشر المنتج فوراً</Label>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch id="isNew" checked={formData.isNew} onCheckedChange={(checked: boolean) => setFormData({ ...formData, isNew: checked })} />
          <Label htmlFor="isNew">منتج جديد</Label>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch id="isOnSale" checked={formData.isOnSale} onCheckedChange={(checked: boolean) => setFormData({ ...formData, isOnSale: checked })} />
          <Label htmlFor="isOnSale">عليه عرض</Label>
        </div>
      </div>

        {/* Installation option controlled by vendor */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="addonInstallEnabled"
              checked={!!formData.addonInstallEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, addonInstallEnabled: !!checked })}
            />
            <Label htmlFor="addonInstallEnabled">يقدم خدمة التركيب</Label>
          </div>
          {formData.addonInstallEnabled && (
            <div>
              <Label htmlFor="addonInstallFee">رسوم خدمة التركيب لكل قطعة (ريال)</Label>
              <Input
                id="addonInstallFee"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(formData.addonInstallFee ?? '')}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, addonInstallFee: v });
                }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1">
            {product ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
