"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import type { Cart } from "@/lib/types";
import { useCartSheet } from "@/components/cart-sheet";
import { Button } from "@/components/ui/button";

export function CartBadge() {
  const { data: session } = useSession();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.accessToken) return;
      try {
        const res = await api.get<Cart>("/cart/", authHeaders(session.accessToken));
        if (active) setCount(res.data.total_items);
      } catch {
        if (active) setCount(null);
      }
    };
    void load();
    const handler = () => void load();
    window.addEventListener("cart:changed", handler);
    return () => {
      active = false;
      window.removeEventListener("cart:changed", handler);
    };
  }, [session?.accessToken]);

  if (count === null || count === 0) return null;
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
      {count}
    </span>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const { openCart } = useCartSheet();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Shop<span className="text-primary">AI</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/products" className="hover:text-foreground">
              Products
            </Link>
            {session && (
              <Link href="/orders" className="hover:text-foreground">
                Orders
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              <Button variant="ghost" size="sm" onClick={openCart}>
                Cart
                <CartBadge />
              </Button>
              <span className="hidden items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm sm:inline-flex">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(session.user?.name ?? session.user?.email ?? "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="max-w-32 truncate font-medium">
                  {session.user?.name ?? session.user?.email}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut({ redirectTo: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
