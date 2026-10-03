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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    api
      .get<Order[]>("/orders/", authHeaders(session.accessToken))
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [session?.accessToken, status]);

  if (loading || status === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your orders</h1>
      {orders.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No orders yet.{" "}
          <Link href="/" className="underline hover:text-foreground">
            Start shopping
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Order #{order.id}
                  </CardTitle>
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
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {formatDate(order.created_at)} · {order.items.length} item
                  {order.items.length === 1 ? "" : "s"}
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-sm text-muted-foreground">
                    {order.items.map((item) => item.product.name).join(", ")}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(order.total)}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
