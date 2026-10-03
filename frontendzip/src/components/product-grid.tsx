import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGrid({
  products,
  loading,
}: {
  products: Product[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        No products found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
