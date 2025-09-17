import { useState, useEffect } from "react";
import {
  ArrowRight,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import Swal from "sweetalert2";
import { toastSuccess, toastInfo } from "../utils/alerts";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { RouteContext } from "../components/Router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useTranslation } from "../hooks/useTranslation";
import { getProductById, getProductBySlug, getCategoryById } from "@/services/products";

// Remove static related products and reviews; page is fully backend-driven

import { WishlistItem } from "../components/Router";

interface ProductDetailsProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  selectedProduct?: any;
  addToCart?: (item: any) => void;
  isInWishlist?: (id: string) => boolean;
  addToWishlist?: (item: WishlistItem) => void;
  removeFromWishlist?: (id: string) => void;
}

export default function ProductDetails({
  currentPage,
  setCurrentPage,
  selectedProduct,
  addToCart,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  ...rest
}: ProductDetailsProps & Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isVendor = ((rest as any)?.user?.role) === 'vendor';
  const currency = locale === "ar" ? "ر.س" : "SAR";
  const getText = (val: any): string => {
    if (val && typeof val === "object") {
      return val[locale] ?? val.ar ?? val.en ?? "";
    }
    return String(val ?? "");
  };

  // Try to fetch full product details from backend when an id or slug is present
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cand: any = selectedProduct;
        if (!cand) return;
        if (cand.id && Number.isFinite(Number(cand.id))) {
          const { ok, data } = await getProductById(Number(cand.id));
          if (ok && data && !cancelled) setRemoteProduct({
            id: (data as any).id,
            name: { ar: (data as any).nameAr || '', en: (data as any).nameEn || '' },
            brand: { ar: 'عام', en: 'Generic' },
            categoryId: (data as any).categoryId ?? (cand as any).categoryId,
            price: Number((typeof (data as any).discountPrice === 'number' && (data as any).discountPrice > 0 && (data as any).discountPrice < Number((data as any).price ?? 0))
              ? (data as any).discountPrice
              : (data as any).price ?? 0),
            originalPrice: Number((data as any).price ?? 0),
            rating: Number((data as any).averageRating ?? 0),
            reviewCount: Number((data as any).reviewCount ?? 0),
            images: Array.isArray((data as any).images) ? ((data as any).images.map((im:any)=> im?.imageUrl).filter(Boolean)) : (((data as any).imageUrl ? [(data as any).imageUrl] : [])),
            inStock: Number((data as any).stockQuantity ?? 0) > 0,
            stockCount: Number((data as any).stockQuantity ?? 0),
            isNew: false,
            isOnSale: false,
            compatibility: [],
            partNumber: (data as any).sku || '',
            warranty: { ar: 'سنة', en: '1 year' },
            description: { ar: (data as any).descriptionAr || '', en: (data as any).descriptionEn || '' },
            features: [],
            installationTips: [],
            addonInstallation: (cand as any)?.addonInstallation,
          });
          return;
        }
        if (cand.slug && typeof cand.slug === 'string') {
          const { ok, data } = await getProductBySlug(String(cand.slug));
          if (ok && data && !cancelled) setRemoteProduct({ ...cand, ...data });
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedProduct)]);
  const [quantity, setQuantity] = useState(1);
  const [installSelected, setInstallSelected] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState("");
  
  // Prefer remote fetched product when available
  const [remoteProduct, setRemoteProduct] = useState<any | null>(null);
  // Use only backend/selected source; no static fallback
  const product = remoteProduct || selectedProduct || null;

  // Check if product is in wishlist using props
  const isWishlisted = isInWishlist && isInWishlist(product?.id || "1");

  const deriveImages = (p: any): string[] => {
    try {
      if (!p) return [];
      const imgs = p.images;
      if (Array.isArray(imgs)) {
        // Support arrays of strings or objects with common keys
        const mapped = imgs
          .map((im: any) => {
            if (!im) return null;
            if (typeof im === 'string') return im;
            return im.imageUrl || im.url || im.src || null;
          })
          .filter(Boolean) as string[];
        if (mapped.length) return mapped;
      }
      // Single image common fields
      const single = p.imageUrl || p.image || p.thumbnail || p.mainImage || null;
      if (single) return [String(single)];
      return [];
    } catch { return []; }
  };

  const images = deriveImages(product);
  // If product has no images, we'll optionally fall back to category image further below
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // displayedImages will be recalculated after we (optionally) fetch a category image; define a placeholder now
  let displayedImages: string[] = images;
  const discountPercentage =
    product && Number(product.originalPrice) > Number(product.price)
      ? Math.round(
          ((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100
        )
      : 0;

  // Normalize availability in case product from other pages lacks these fields
  const normalizedInStock = !!product && ((product as any).inStock !== false) && ((((product as any).stockCount ?? (product as any).stock ?? 1) as number) > 0);
  const normalizedStockCount = (product as any)?.stockCount ?? (product as any)?.stock ?? 99;

  const textName = getText(product?.name || '').toLowerCase();
  const textCat = '';
  const textSub = '';
  const isDoorLike = /باب|door/.test(textName) || /باب|door/.test(textCat) || /باب|door/.test(textSub);
  const isWindowLike = /شباك|نافذة|window/.test(textName) || /شباك|نافذة|window/.test(textCat) || /شباك|نافذة|window/.test(textSub);
  const doorWindowIds = new Set(['wd-1','mw-1','aw-1']);
  // Prefer vendor-provided installation availability and fee if present
  const vendorInstallEnabled = !!(product as any)?.addonInstallation?.enabled;
  const vendorInstallFee = Number((product as any)?.addonInstallation?.feePerUnit ?? 50);
  const fallbackInstall = doorWindowIds.has(product?.id || '') || isDoorLike || isWindowLike;
  const showInstallOption = vendorInstallEnabled ? true : fallbackInstall;
  const INSTALL_FEE_PER_UNIT = vendorInstallEnabled ? vendorInstallFee : 50;
  const priceWithAddon = (product?.price || 0) + (showInstallOption && installSelected ? INSTALL_FEE_PER_UNIT : 0);
  const subtotal = priceWithAddon * quantity;

  const handleAddToCart = () => {
    // Front-only add to cart using context
    if (addToCart) {
      addToCart({
        id: product.id,
        name: getText(product.name),
        price: priceWithAddon,
        image: displayedImages[0],
        partNumber: product.partNumber,
        quantity,
        inStock: normalizedInStock,
        maxQuantity: normalizedStockCount,
        originalPrice: product.originalPrice,
        brand: getText(product.brand),
        // metadata
        addonInstallation: showInstallOption && installSelected ? {
          enabled: true,
          feePerUnit: INSTALL_FEE_PER_UNIT,
          totalFee: INSTALL_FEE_PER_UNIT * quantity,
          label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
        } : { enabled: false }
      });
    }
    if (setCurrentPage) {
      setCurrentPage("cart");
    }
  };

  const handleBuyNow = () => {
    if (addToCart) {
      addToCart({
        id: product.id,
        name: getText(product.name),
      price: priceWithAddon,
      image: images[0],
      partNumber: product.partNumber,
      quantity,
      inStock: normalizedInStock,
      maxQuantity: normalizedStockCount,
      originalPrice: product.originalPrice,
      brand: getText(product.brand),
      addonInstallation: showInstallOption && installSelected ? {
        enabled: true,
        feePerUnit: INSTALL_FEE_PER_UNIT,
        totalFee: INSTALL_FEE_PER_UNIT * quantity,
        label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
      } : { enabled: false }
      });
    }
    if (setCurrentPage) {
      setCurrentPage("checkout");
    }
  };

  // Resolve category name if categoryId exists
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryImage, setCategoryImage] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cid = (product as any)?.categoryId;
        if (!cid) { setCategoryName(""); return; }
        const { ok, data } = await getCategoryById(String(cid));
        if (ok && data && !cancelled) {
          setCategoryName(String((data as any)?.nameAr || (data as any)?.nameEn || ''));
          const cimg = (data as any)?.imageUrl || (data as any)?.ImageUrl || '';
          if (cimg) setCategoryImage(String(cimg));
        }
      } catch { setCategoryName(""); }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify((product as any)?.categoryId)]);

  // Final displayed images with category fallback
  displayedImages = images.length ? images : (categoryImage ? [categoryImage] : []);

  // Keep selected index within bounds when images change
  useEffect(() => {
    if (selectedImageIndex > Math.max(0, displayedImages.length - 1)) {
      setSelectedImageIndex(0);
    }
  }, [displayedImages.length]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="product-details" setCurrentPage={setCurrentPage!} {...(rest as any)} />
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">{locale==='ar'? 'المنتج غير موجود' : 'Product not found'}</h2>
              <Button className="mt-2" onClick={() => setCurrentPage && setCurrentPage('products')}>
                {locale==='ar'? 'العودة للمنتجات' : 'Back to Products'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer setCurrentPage={setCurrentPage!} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <Header currentPage="product-details" setCurrentPage={setCurrentPage!} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button
            onClick={() => setCurrentPage && setCurrentPage("home")}
            className="hover:text-primary"
          >
            {t("home")}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button
            onClick={() => setCurrentPage && setCurrentPage("products")}
            className="hover:text-primary"
          >
            {t("products")}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button
            onClick={() => {
              try {
                (rest as any)?.setSearchFilters && (rest as any).setSearchFilters({ term: '', categoryId: Number((product as any)?.categoryId || 0) });
              } catch {}
              setCurrentPage && setCurrentPage('products');
            }}
            className="hover:text-primary"
          >
            {categoryName || (locale==='ar'? 'الصنف' : 'Category')}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-foreground">{getText(product.name)}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <ImageWithFallback
                src={displayedImages[selectedImageIndex]}
                alt={getText(product.name)}
                className="w-full h-96 object-cover rounded-lg"
              />
              {product.isNew && (
                <Badge className="absolute top-4 right-4 bg-green-500">
                  {locale === "en" ? "New" : "جديد"}
                </Badge>
              )}
              {product.isOnSale && (
                <Badge className="absolute top-4 left-4 bg-red-500">
                  {locale === "en" ? "Discount" : "خصم"} {discountPercentage}%
                </Badge>
              )}

              {displayedImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() =>
                      setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))
                    }
                    disabled={selectedImageIndex === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() =>
                      setSelectedImageIndex(
                        Math.min(displayedImages.length - 1, selectedImageIndex + 1)
                      )
                    }
                    disabled={selectedImageIndex === displayedImages.length - 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {displayedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {displayedImages.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 border-2 rounded-lg overflow-hidden ${
                      index === selectedImageIndex
                        ? "border-primary"
                        : "border-gray-200"
                    }`}
                    aria-label={`thumbnail-${index + 1}`}
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`${getText(product.name)} - ${index + 1}`}
                      className="w-20 h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{getText(product.name)}</h1>
              <p className="text-muted-foreground mb-4">
                {locale === "en" ? "Brand" : "العلامة التجارية"}: {getText(product.brand)}
              </p>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} Reviews)
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-primary">
                  {product.price} {currency}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {product.originalPrice} {currency}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    normalizedInStock
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {normalizedInStock
                    ? `${t("available")} (${normalizedStockCount})`
                    : t("outOfStock")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("partNumber")}: {product.partNumber}
                </span>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">{t("quantity")}:</label>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= normalizedStockCount}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showInstallOption && (
                <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/40">
                  <input
                    id="install-addon"
                    type="checkbox"
                    className="mt-1"
                    checked={installSelected}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstallSelected(e.target.checked)}
                  />
                  <label htmlFor="install-addon" className="text-sm cursor-pointer">
                    <span className="font-medium">
                      {locale === 'ar' ? 'خدمة تركيب احترافية' : 'Professional installation service'}
                    </span>
                    <span className="mx-1">•</span>
                    <span className="text-primary font-semibold">{INSTALL_FEE_PER_UNIT} {currency}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {locale === 'ar' ? 'تقديم الخدمة بمعايير عالية مع ضمان جودة الخدمة.' : 'Delivered with high standards and a quality guarantee.'}
                    </div>
                    {installSelected && (
                      <div className="text-xs mt-1">
                        {locale === 'ar'
                          ? `إجمالي خدمة التركيب: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )`
                          : `Installation total: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )`}
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Subtotal reflecting quantity and installation per unit */}
              <div className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                <span className="text-muted-foreground">
                  {locale === 'ar' ? 'الإجمالي (يشمل التركيب إن وجد)' : 'Subtotal (incl. installation if selected)'}
                </span>
                <span className="font-semibold text-primary">
                  {subtotal} {currency}
                </span>
              </div>

              <div className="flex gap-4">
                {!isVendor && (
                  <Button
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={!normalizedInStock}
                  >
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    {t("addToCart")}
                  </Button>
                )}
                {!isVendor && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (!isWishlisted) {
                        addToWishlist && addToWishlist({
                          id: product?.id || "1",
                          name: getText(product?.name),
                          price: product?.price || 0,
                          brand: getText(product?.brand),
                          originalPrice: product?.originalPrice,
                          image: product?.images?.[0] || "",
                          partNumber: product?.partNumber,
                          inStock: product?.inStock || false
                        });
                        toastSuccess(locale === 'en' ? 'Added to wishlist' : 'تمت الإضافة إلى المفضلة', locale==='ar');
                      } else {
                        removeFromWishlist && removeFromWishlist(product?.id || "1");
                        toastInfo(locale === 'en' ? 'Removed from wishlist' : 'تمت الإزالة من المفضلة', locale==='ar');
                      }
                    }}
                    className={isWishlisted ? "text-red-500 border-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                  </Button>
                )}
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleBuyNow}
                disabled={!normalizedInStock}
              >
                {t("buyNow")}
              </Button>
            </div>

            {/* Key Features */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <Truck className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{locale === 'en' ? 'Free Shipping' : 'شحن مجاني'}</span>
                    <span className="text-xs text-muted-foreground">
                      {locale === 'en' ? `For orders over 200 ${currency}` : `للطلبات أكثر من 200 ${currency}`}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Shield className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{locale === 'en' ? `Warranty ${getText(product.warranty)}` : `ضمان ${getText(product.warranty)}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {locale === 'en' ? 'Manufacturer warranty' : 'ضمان الشركة المصنعة'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <RotateCcw className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{t("returnPolicy")}</span>
                    <span className="text-xs text-muted-foreground">
                      30 {t("days") || "days"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description">{t("description")}</TabsTrigger>
            <TabsTrigger value="specifications">
              {t("specifications")}
            </TabsTrigger>
            <TabsTrigger value="compatibility">
              {t("compatibility") || "Compatibility"}
            </TabsTrigger>
            <TabsTrigger value="reviews">
              {t("reviews")} ({product.reviewCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="mb-6">{getText(product.description)}</p>

                <h3 className="font-medium mb-4">{t("features")}</h3>
                <ul className="space-y-2">
                  {product.features?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {product.installationTips && (
                  <>
                    <h3 className="font-medium mb-4 mt-6">
                      {locale === 'en' ? 'Installation Tips' : 'نصائح التركيب'}
                    </h3>
                    <ol className="space-y-2">
                      {product.installationTips.map((tip: string, index: number) => (
                        <li key={index} className="flex gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground text-sm rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {Object.entries(product.specifications || {}).map(
                    ([key, value]: [string, unknown]) => (
                      <div
                        key={key}
                        className="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-medium">{key}</span>
                        <span className="text-muted-foreground">{typeof value === 'object' && value !== null ? getText(value as any) : String(value)}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compatibility" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">
                  {t("compatibility") || "Compatibility"}:
                </h3>
                <div className="grid gap-2">
                  {product.compatibility?.map((car: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{typeof car === 'object' && car !== null ? getText(car) : String(car)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="text-center text-muted-foreground py-10">
              {locale==='ar' ? 'قريباً: تقييمات العملاء' : 'Customer reviews coming soon'}
            </div>
          </TabsContent>
        </Tabs>

        {/* Related products placeholder (to be powered by backend later) */}
        <div className="text-center text-muted-foreground py-8">
          {locale==='ar' ? 'قريباً: منتجات ذات صلة من نفس الفئة' : 'Related products from same category coming soon'}
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage!} />
    </div>
  );
}
