import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 10) return <Badge variant="secondary">Low stock</Badge>;
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group">
      <Card className="h-full gap-3 overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          )}
        </div>
        <CardHeader className="px-4">
          <CardTitle className="line-clamp-1 text-base">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Badge variant="outline">{product.category.name}</Badge>
        </CardContent>
        <CardFooter className="flex items-center justify-between px-4 pb-4">
          <span className="text-base font-semibold">
            {formatPrice(product.price)}
          </span>
          <StockBadge stock={product.stock} />
        </CardFooter>
      </Card>
    </Link>
  );
}
