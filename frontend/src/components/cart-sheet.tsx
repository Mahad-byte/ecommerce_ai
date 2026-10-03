"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Cart } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const CartSheetContext = createContext<{ openCart: () => void } | null>(null);

export function useCartSheet() {
  const ctx = useContext(CartSheetContext);
  if (!ctx) throw new Error("useCartSheet must be used within CartSheetProvider");
  return ctx;
}

export function CartSheetProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCart() {
    setError(null);
    setOpen(true);
  }

  async function refreshCart() {
    if (!session?.accessToken) return;
    try {
      const res = await api.get<Cart>("/cart/", authHeaders(session.accessToken));
      setCart(res.data);
    } catch {
      setError("Could not load your cart.");
    }
  }

  useEffect(() => {
    if (!open || status !== "authenticated") return;
    let active = true;
    const load = async () => {
      if (!session?.accessToken) return;
      try {
        const res = await api.get<Cart>("/cart/", authHeaders(session.accessToken));
        if (active) setCart(res.data);
      } catch {
        if (active) setError("Could not load your cart.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [open, status, session?.accessToken]);

  async function updateQuantity(itemId: number, quantity: number) {
    if (!session?.accessToken || !cart || quantity < 1) return;
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
      await refreshCart();
    } catch {
      await refreshCart();
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
      setError("Could not remove the item.");
    }
    await refreshCart();
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

  const hasItems = !!cart && cart.items.length > 0;

  return (
    <CartSheetContext.Provider value={{ openCart }}>
      {children}
      <Sheet open={open} onOpenChange={(value) => setOpen(value)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
          <SheetHeader className="border-b">
            <SheetTitle>Your cart</SheetTitle>
            <SheetDescription>
              {hasItems
                ? `${cart!.total_items} ${cart!.total_items === 1 ? "item" : "items"}`
                : "Free shipping on orders over $50"}
            </SheetDescription>
          </SheetHeader>

          {status !== "authenticated" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm font-medium">Log in to see your cart</p>
              <Link
                href="/login"
                className={buttonVariants({ size: "sm" })}
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
            </div>
          ) : cart === null ? (
            <p className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Loading…
            </p>
          ) : !hasItems ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs text-muted-foreground">
                Browse the store and add something you like.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Continue shopping
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 divide-y overflow-y-auto px-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.product.image_url && (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.product.price)} each
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.stock}
                        >
                          +
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="ml-auto h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${item.product.name} from cart`}
                          title="Remove item"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatPrice(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>

              <SheetFooter className="border-t">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total_price)}</span>
                </div>
                <Button
                  className="w-full"
                  onClick={checkout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Redirecting to Stripe…" : "Checkout"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Continue shopping
                </Button>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="text-center text-xs text-muted-foreground underline hover:text-foreground"
                >
                  View full cart
                </Link>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </CartSheetContext.Provider>
  );
}
