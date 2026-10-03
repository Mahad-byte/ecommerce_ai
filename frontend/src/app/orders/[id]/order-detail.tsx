"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { api, authHeaders } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function OrderDetail({ orderId }: { orderId: string }) {
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    api
      .get<Order>(`/orders/${orderId}/`, authHeaders(session.accessToken))
      .then((res) => setOrder(res.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, session?.accessToken, status]);

  if (loading || status === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/orders" className="text-sm underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Order #{order.id}
        </h1>
        <Badge
          variant={
            order.status === "paid"
              ? "default"
              : order.status === "pending"
                ? "secondary"
                : "destructive"
          }
          className="capitalize"
        >
          {order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted-foreground">
            Placed {formatDate(order.created_at)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4">
              <div>
                <Link
                  href={`/products/${item.product.slug}`}
                  className="font-medium hover:underline"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <span className="font-medium">{formatPrice(item.line_total)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
