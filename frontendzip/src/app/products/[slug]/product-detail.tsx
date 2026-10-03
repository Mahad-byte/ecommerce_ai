"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { StockBadge } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetail({ slug }: { slug: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .get<Product>(`/products/${slug}/`)
      .then((res) => {
        if (!ignore) setProduct(res.data);
      })
      .catch(() => {
        if (!ignore) setProduct(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [slug]);

  async function addToCart() {
    if (status !== "authenticated" || !session?.accessToken) {
      router.push(`/login?callbackUrl=/products/${slug}`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await api.post(
        "/cart/items/",
        { product_id: product!.id, quantity },
        authHeaders(session.accessToken),
      );
      window.dispatchEvent(new Event("cart:changed"));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      const detail =
        (err as { response?: { data?: Record<string, string[]> } }).response
          ?.data &&
        Object.values(
          (err as { response?: { data?: Record<string, string[]> } }).response!
            .data!,
        )
          .flat()[0];
      setError(detail ?? "Could not add to cart.");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Link href="/" className="text-sm underline">
          Back to products
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
        </div>
        <div className="space-y-4">
          <Badge variant="outline">{product.category.name}</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold">
              {formatPrice(product.price)}
            </span>
            <StockBadge stock={product.stock} />
          </div>
          <p className="text-muted-foreground">{product.description}</p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quantity</CardTitle>
              <CardDescription>
                {outOfStock
                  ? "Currently unavailable."
                  : `${product.stock} in stock`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={outOfStock || quantity <= 1}
                >
                  −
                </Button>
                <span className="w-10 text-center text-lg font-medium">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock, q + 1))
                  }
                  disabled={outOfStock || quantity >= product.stock}
                >
                  +
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={addToCart}
                disabled={outOfStock || adding}
              >
                {outOfStock
                  ? "Out of stock"
                  : adding
                    ? "Adding…"
                    : added
                      ? "Added to cart ✓"
                      : status === "authenticated"
                        ? "Add to cart"
                        : "Log in to add to cart"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
