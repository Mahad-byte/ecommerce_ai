"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VerifyOrder({ orderId }: { orderId: string }) {
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (status !== "authenticated" || !session?.accessToken || !orderId) {
        return;
      }
      try {
        const res = await api.post<Order>(
          `/orders/${orderId}/verify/`,
          {},
          authHeaders(session.accessToken),
        );
        if (!ignore) {
          setOrder(res.data);
          window.dispatchEvent(new Event("cart:changed"));
        }
      } catch {
        if (!ignore) setError("Could not verify the payment for this order.");
      } finally {
        if (!ignore) setVerifying(false);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [orderId, session?.accessToken, status]);

  const paid = order?.status === "paid";
  const busy = verifying && status !== "unauthenticated";

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 text-4xl">
            {busy ? "⏳" : paid ? "✅" : "⚠️"}
          </div>
          <CardTitle className="text-xl">
            {busy
              ? "Verifying your payment…"
              : paid
                ? "Payment successful!"
                : "Payment pending"}
          </CardTitle>
          <CardDescription>
            {busy
              ? "Checking with Stripe…"
              : paid
                ? "Thanks for your purchase. Your order is confirmed."
                : (error ??
                  "We couldn't confirm the payment yet. If you completed it, check your orders in a moment.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Order #{order.id}
                </span>
                <Badge
                  variant={paid ? "default" : "secondary"}
                  className="capitalize"
                >
                  {order.status}
                </Badge>
              </div>
              <div className="mt-1 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Link href="/orders" className={buttonVariants({ className: "flex-1" })}>
              View orders
            </Link>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", className: "flex-1" })}
            >
              Keep shopping
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
