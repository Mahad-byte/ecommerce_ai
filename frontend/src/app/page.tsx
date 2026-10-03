"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Backpack,
  Briefcase,
  Camera,
  ChefHat,
  Dumbbell,
  Gamepad2,
  Headphones,
  Heart,
  PawPrint,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tent,
  Watch,
  type LucideIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Category, PaginatedProducts, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Smartphone,
  audio: Headphones,
  wearables: Watch,
  accessories: Backpack,
  gaming: Gamepad2,
  "home-kitchen": ChefHat,
  office: Briefcase,
  fitness: Dumbbell,
  photography: Camera,
  beauty: Heart,
  outdoors: Tent,
  pets: PawPrint,
};

export default function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get<Category[]>("/categories/"),
      api.get<PaginatedProducts>("/products/", {
        params: { ordering: "-created_at" },
      }),
    ])
      .then(([categoriesRes, productsRes]) => {
        if (ignore) return;
        setCategories(categoriesRes.data);
        setProducts(productsRes.data.results.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function openChat() {
    window.dispatchEvent(new Event("chat:open"));
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-[#8f4d4d] via-[#ab6a6a] to-[#d8a2a2] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Groq AI
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Shop smarter with AI
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#f7e8e8]">
            Hundreds of products across 12 categories — and an assistant that
            finds exactly what you need, at the budget you have.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#8f4d4d] shadow-sm transition-colors hover:bg-[#f7ecec]"
            >
              Browse products
            </Link>
            <button
              onClick={openChat}
              className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Ask the assistant
            </button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-white backdrop-blur">
              345+ products
            </span>
            <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-white backdrop-blur">
              12 categories
            </span>
            <span className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-white backdrop-blur">
              AI shopping assistant
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-bold tracking-tight">Shop by category</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] animate-pulse rounded-xl bg-muted"
                />
              ))
            : categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.slug] ?? ShoppingBag;
                return (
                  <Link
                    key={category.slug}
                    href={`/products?category=${category.slug}`}
                    className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium transition-colors group-hover:text-primary">
                      {category.name}
                    </span>
                  </Link>
                );
              })}
        </div>
      </section>

      <section className="bg-card py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">New arrivals</h2>
            <Link
              href="/products"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-col items-center gap-5 rounded-2xl bg-gradient-to-r from-[#8f4d4d] to-[#c48a8a] px-6 py-10 text-center text-white sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-semibold">Not sure what to buy?</p>
            <p className="mt-1 text-sm text-[#f7e8e8]">
              Tell the assistant your budget — “headphones under $50” — and it
              finds the matches for you.
            </p>
          </div>
          <button
            onClick={openChat}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#8f4d4d] transition-colors hover:bg-[#f7ecec]"
          >
            Try the assistant
          </button>
        </div>
      </section>
    </div>
  );
}
