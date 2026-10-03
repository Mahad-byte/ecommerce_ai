"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import type { Cart } from "@/lib/types";
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

  if (count === null) return null;
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
      {count}
    </span>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Shop<span className="text-primary">AI</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/" className="hover:text-foreground">
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
              <Link href="/cart">
                <Button variant="ghost" size="sm">
                  Cart
                  <CartBadge />
                </Button>
              </Link>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user?.name}
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
