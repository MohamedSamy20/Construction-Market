import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { RouteContext } from "./Router";
import { useTranslation } from "../hooks/useTranslation";
import { getRootCategories } from "@/services/products";

export default function ProductCategories({ setCurrentPage, setSearchFilters }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const [cats, setCats] = useState<Array<{ id: string | number; title: string; description?: string; image?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await getRootCategories();
        if (ok && Array.isArray(data) && !cancelled) {
          const mapped = (data as any[]).map((c: any) => ({
            id: c.id,
            title: String(locale === 'ar' ? (c.nameAr || c.nameEn || '') : (c.nameEn || c.nameAr || '')),
            description: typeof c.descriptionAr !== 'undefined' || typeof c.descriptionEn !== 'undefined'
              ? String(locale === 'ar' ? (c.descriptionAr || '') : (c.descriptionEn || ''))
              : undefined,
            image: c.imageUrl || undefined,
          }));
          setCats(mapped);
        }
      } catch {
        // leave empty on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <section className="py-16 bg-gray-50" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("categories")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("categoryDescription")}
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-64 bg-gray-100 rounded" />
            ))}
          </div>
        )}
        {!loading && cats.length === 0 && (
          <div className="text-center text-muted-foreground">
            {locale === 'ar' ? 'لا توجد فئات لعرضها حالياً.' : 'No categories to display yet.'}
          </div>
        )}
        {!loading && cats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cats.map((category) => (
            <Card
              key={category.id}
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="relative h-48 overflow-hidden">
                {(category as any).image ? (
                  <ImageWithFallback
                    src={(category as any).image}
                    alt={(category as any).title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"></div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-2">{(category as any).title}</h3>
                {(category as any).description ? (
                  <p className="text-muted-foreground mb-4">{(category as any).description}</p>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-900 bg-white"
                  onClick={() => {
                    // Navigate to products and search by category name via backend search
                    setSearchFilters && setSearchFilters({ term: (category as any).title });
                    setCurrentPage && setCurrentPage("products");
                  }}
                >
                  {t("viewAll")}
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
