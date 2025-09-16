import { useEffect, useRef, useState } from 'react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getAllCategories, type CategoryDto, createCategory, updateCategory, deleteCategory } from '../../services/products';
import { api } from '../../lib/api';

export default function AdminProductOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  // New category inputs (Arabic and English)
  const [newCategoryAr, setNewCategoryAr] = useState('');
  const [newCategoryEn, setNewCategoryEn] = useState('');
  const [newDescriptionAr, setNewDescriptionAr] = useState('');
  const [newDescriptionEn, setNewDescriptionEn] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const newImageInputRef = useRef<HTMLInputElement | null>(null);
  const [newImageUploading, setNewImageUploading] = useState(false);
  const [itemImageUploadingId, setItemImageUploadingId] = useState<number | null>(null);
  const itemImageInputRef = useRef<HTMLInputElement | null>(null);
  const [newParentId, setNewParentId] = useState<number | ''>('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newSortOrder, setNewSortOrder] = useState<number | ''>('');
  // DB categories
  const [dbCategories, setDbCategories] = useState<CategoryDto[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Load categories from DB
    let mounted = true;
    const load = async () => {
      try {
        setDbLoading(true);
        setDbError(null);
        const { ok, data } = await getAllCategories();
        if (!mounted) return;
        if (ok && Array.isArray(data)) {
          setDbCategories(data as any);
        } else {
          setDbCategories([]);
          setDbError(locale==='ar' ? 'تعذر جلب الفئات من الخادم' : 'Failed to fetch categories from server');
        }
      } catch {
        if (!mounted) return;
        setDbCategories([]);
        setDbError(locale==='ar' ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
      } finally {
        if (mounted) setDbLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [locale]);

  const handlePickNewImage = () => {
    newImageInputRef.current?.click();
  };

  const handleNewImageSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setNewImageUploading(true);
      const { ok, data } = await api.uploadFile(file, 'images');
      if (ok && data?.success) {
        setNewImageUrl(data.url);
      } else {
        alert('Failed to upload image');
      }
    } finally {
      setNewImageUploading(false);
      e.target.value = '';
    }
  };

  const triggerItemImageUpload = (categoryId: number) => {
    setItemImageUploadingId(categoryId);
    itemImageInputRef.current?.click();
  };

  const handleItemImageSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    const catId = itemImageUploadingId;
    if (!file || !catId) { setItemImageUploadingId(null); return; }
    try {
      const { ok, data } = await api.uploadFile(file, 'images');
      if (ok && data?.success) {
        const { ok: okUpdate } = await updateCategory(catId, { imageUrl: data.url } as any);
        if (okUpdate) await reload();
        else alert(locale==='ar' ? 'فشل تحديث الصورة' : 'Failed to update image');
      } else {
        alert(locale==='ar' ? 'فشل رفع الصورة' : 'Image upload failed');
      }
    } finally {
      setItemImageUploadingId(null);
      e.target.value = '';
    }
  };

  const reload = async () => {
    try {
      setDbLoading(true);
      const { ok, data } = await getAllCategories();
      if (ok && Array.isArray(data)) setDbCategories(data as any);
    } finally {
      setDbLoading(false);
    }
  };

  const addCategory = async () => {
    const ar = newCategoryAr.trim();
    const en = newCategoryEn.trim();
    if (!ar || !en) return;
    const payload: any = {
      nameAr: ar,
      nameEn: en,
      descriptionAr: newDescriptionAr.trim() || null,
      descriptionEn: newDescriptionEn.trim() || null,
      imageUrl: newImageUrl.trim() || null,
      parentCategoryId: newParentId === '' ? null : Number(newParentId),
      isActive: newIsActive,
      sortOrder: newSortOrder === '' ? undefined : Number(newSortOrder)
    };
    const { ok } = await createCategory(payload);
    if (ok) {
      setNewCategoryAr('');
      setNewCategoryEn('');
      setNewDescriptionAr('');
      setNewDescriptionEn('');
      setNewImageUrl('');
      setNewParentId('');
      setNewIsActive(true);
      setNewSortOrder('');
      await reload();
    } else {
      alert(locale==='ar' ? 'فشل إضافة الفئة' : 'Failed to add category');
    }
  };

  const removeCategory = async (id: number) => {
    if (!confirm(locale==='ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure to delete?')) return;
    const { ok } = await deleteCategory(id);
    if (ok) await reload();
    else alert(locale==='ar' ? 'فشل حذف الفئة' : 'Failed to delete category');
  };

  const editCategory = async (cat: CategoryDto) => {
    const inputAr = window.prompt(locale==='ar' ? 'تعديل الاسم (عربي)' : 'Edit Arabic name', cat.nameAr || '');
    if (inputAr == null) return;
    const inputEn = window.prompt(locale==='ar' ? 'تعديل الاسم (إنجليزي)' : 'Edit English name', cat.nameEn || '');
    if (inputEn == null) return;
    const inputDescAr = window.prompt(locale==='ar' ? 'تعديل الوصف (عربي)' : 'Edit Arabic description', cat.descriptionAr || '');
    if (inputDescAr == null) return;
    const inputDescEn = window.prompt(locale==='ar' ? 'تعديل الوصف (إنجليزي)' : 'Edit English description', cat.descriptionEn || '');
    if (inputDescEn == null) return;
    const inputImageUrl = window.prompt(locale==='ar' ? 'رابط الصورة (اختياري)' : 'Image URL (optional)', cat.imageUrl || '');
    if (inputImageUrl == null) return;
    const inputIsActive = window.prompt(locale==='ar' ? 'حالة التفعيل (true/false)' : 'Is Active (true/false)', String(cat.isActive));
    if (inputIsActive == null) return;
    const inputSort = window.prompt(locale==='ar' ? 'ترتيب العرض (رقم)' : 'Sort order (number)', String(cat.sortOrder ?? ''));
    if (inputSort == null) return;
    const newAr = inputAr.trim();
    const newEn = inputEn.trim();
    if (!newAr || !newEn) return;
    const payload: any = {
      nameAr: newAr,
      nameEn: newEn,
      descriptionAr: inputDescAr.trim() || null,
      descriptionEn: inputDescEn.trim() || null,
      imageUrl: inputImageUrl.trim() || null,
      isActive: /^true$/i.test(inputIsActive.trim()),
      sortOrder: inputSort.trim() === '' ? undefined : Number(inputSort.trim())
    };
    const { ok } = await updateCategory(cat.id, payload);
    if (ok) await reload();
    else alert(locale==='ar' ? 'فشل تعديل الفئة' : 'Failed to update category');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'خيارات المنتجات (للوحة الأدمن)' : 'Product Options (Admin)'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'أدر فئات المنتجات مباشرة من قاعدة البيانات.' : 'Manage product categories directly from the database.'}</p>

        {/* DB Categories */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{locale==='ar' ? 'فئات المنتجات (من قاعدة البيانات)' : 'Product Categories (From Database)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder={locale==='ar' ? 'الاسم بالعربي' : 'Name (Arabic)'}
                value={newCategoryAr}
                onChange={(e) => setNewCategoryAr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }}
              />
              <Input
                placeholder={locale==='ar' ? 'الاسم بالإنجليزي' : 'Name (English)'}
                value={newCategoryEn}
                onChange={(e) => setNewCategoryEn(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }}
              />
              <Button onClick={() => void addCategory()} className="w-full md:w-auto" disabled={newImageUploading}>{locale==='ar' ? (newImageUploading ? '...جاري الرفع' : 'إضافة') : (newImageUploading ? 'Uploading...' : 'Add')}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder={locale==='ar' ? 'الوصف بالعربي (اختياري)' : 'Description (Arabic) optional'}
                value={newDescriptionAr}
                onChange={(e) => setNewDescriptionAr(e.target.value)}
              />
              <Input
                placeholder={locale==='ar' ? 'الوصف بالإنجليزي (اختياري)' : 'Description (English) optional'}
                value={newDescriptionEn}
                onChange={(e) => setNewDescriptionEn(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handlePickNewImage} disabled={newImageUploading}>
                  {newImageUploading ? (locale==='ar' ? '...جاري الرفع' : 'Uploading...') : (locale==='ar' ? 'اختيار صورة' : 'Choose Image')}
                </Button>
                {newImageUrl && (
                  <img src={newImageUrl} alt="cat" className="h-10 w-10 object-cover rounded" />
                )}
                <input ref={newImageInputRef} type="file" accept="image/*" hidden onChange={handleNewImageSelected} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 items-center">
              <select
                className="border rounded-md h-10 px-2"
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">{locale==='ar' ? 'بدون فئة أب' : 'No parent category'}</option>
                {(dbCategories || []).map(c => (
                  <option key={c.id} value={c.id}>{locale==='ar' ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newIsActive} onChange={(e) => setNewIsActive(e.target.checked)} />
                {locale==='ar' ? 'مفعّل' : 'Active'}
              </label>
              <Input
                type="number"
                placeholder={locale==='ar' ? 'ترتيب العرض (اختياري)' : 'Sort order (optional)'}
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            {dbLoading ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>
            ) : dbError ? (
              <div className="text-sm text-red-600">{dbError}</div>
            ) : !dbCategories || dbCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد فئات في قاعدة البيانات.' : 'No categories in database.'}</div>
            ) : (
              <div className="space-y-2">
                {dbCategories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{c.nameAr}</div>
                      <div className="text-xs text-muted-foreground">{c.nameEn}</div>
                      {c.imageUrl && (
                        <img src={c.imageUrl} alt={c.nameAr || c.nameEn} className="mt-1 h-12 w-12 object-cover rounded" />
                      )}
                      {(c.descriptionAr || c.descriptionEn) && (
                        <div className="text-xs text-muted-foreground">{locale==='ar' ? (c.descriptionAr || c.descriptionEn) : (c.descriptionEn || c.descriptionAr)}</div>
                      )}
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{locale==='ar' ? `مفعل: ${c.isActive ? 'نعم' : 'لا'}` : `Active: ${c.isActive ? 'Yes' : 'No'}`}</span>
                        <span>{locale==='ar' ? `الترتيب: ${c.sortOrder ?? 0}` : `Order: ${c.sortOrder ?? 0}`}</span>
                        {c.parentCategoryId && <span>{locale==='ar' ? `أب: ${c.parentCategoryId}` : `Parent: ${c.parentCategoryId}`}</span>}
                      </div>
                      {c.productCount != null && (
                        <div className="text-xs text-muted-foreground">{locale==='ar' ? `عدد المنتجات: ${c.productCount}` : `Products: ${c.productCount}`}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void editCategory(c)}>
                        {locale==='ar' ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => triggerItemImageUpload(c.id)} disabled={itemImageUploadingId === c.id}>
                        {itemImageUploadingId === c.id ? (locale==='ar' ? '...رفع' : 'Uploading...') : (locale==='ar' ? 'تحديث صورة' : 'Update Image')}
                      </Button>
                      <Button variant="destructive" size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void removeCategory(c.id)}>
                        {locale==='ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
                <input ref={itemImageInputRef} type="file" accept="image/*" hidden onChange={handleItemImageSelected} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
