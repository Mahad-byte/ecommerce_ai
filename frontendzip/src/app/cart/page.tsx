"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Cart } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function CartPage() {
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!session?.accessToken) return;
    try {
      const res = await api.get<Cart>("/cart/", authHeaders(session.accessToken));
      setCart(res.data);
    } catch {
      setError("Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (status !== "authenticated" || !session?.accessToken) return;
      try {
        const res = await api.get<Cart>("/cart/", authHeaders(session.accessToken));
        if (!ignore) setCart(res.data);
      } catch {
        if (!ignore) setError("Could not load your cart.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [session?.accessToken, status]);

  async function updateQuantity(itemId: number, quantity: number) {
    if (!session?.accessToken || !cart) return;
    if (quantity < 1) return;
    setCart({
      ...cart,
      items: cart.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      ),
    });
    try {
      await api.patch(
        `/cart/items/${itemId}/`,
        { quantity },
        authHeaders(session.accessToken),
      );
      window.dispatchEvent(new Event("cart:changed"));
    } catch {
      refresh();
    }
  }

  async function removeItem(itemId: number) {
    if (!session?.accessToken || !cart) return;
    setCart({
      ...cart,
      items: cart.items.filter((item) => item.id !== itemId),
    });
    try {
      await api.delete(
        `/cart/items/${itemId}/`,
        authHeaders(session.accessToken),
      );
      window.dispatchEvent(new Event("cart:changed"));
    } catch {
      refresh();
    }
  }

  async function checkout() {
    if (!session?.accessToken) return;
    setCheckingOut(true);
    setError(null);
    try {
      const res = await api.post<{ checkout_url: string }>(
        "/orders/checkout/",
        {},
        authHeaders(session.accessToken),
      );
      window.location.href = res.data.checkout_url;
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Checkout failed. Please try again.",
      );
      setCheckingOut(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="mb-2 text-lg font-medium">Your cart is empty</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Browse the store and add something you like.
        </p>
        <Link href="/" className={buttonVariants()}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Cart ({cart.total_items})
        </h1>
        {cart.items.map((item) => (
          <Card key={item.id} className="flex-row items-center gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.product.image_url && (
                <Image
                  src={item.product.image_url}
                  alt={item.product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.product.slug}`}
                className="font-medium hover:underline"
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatPrice(item.product.price)} each
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
            <span className="font-semibold">
              {formatPrice(item.line_total)}
            </span>
          </Card>
        ))}
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{cart.total_items}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(cart.total_price)}</span>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              onClick={checkout}
              disabled={checkingOut || cart.items.length === 0}
            >
              {checkingOut ? "Redirecting to Stripe…" : "Checkout"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Test mode — use card 4242 4242 4242 4242
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
