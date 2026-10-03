"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { ProductGrid } from "@/components/product-grid";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Category[]>("/categories/")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (ignore) return;
      setLoading(true);
      const params: Record<string, string> = {};
      if (activeCategory) params.category = activeCategory;
      if (search.trim()) params.search = search.trim();
      api
        .get<Product[]>("/products/", { params })
        .then((res) => {
          if (!ignore) setProducts(res.data);
        })
        .catch(() => {
          if (!ignore) setProducts([]);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, search ? 300 : 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [activeCategory, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() =>
                setActiveCategory(
                  category.slug === activeCategory ? null : category.slug,
                )
              }
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                activeCategory === category.slug
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      <ProductGrid products={products} loading={loading} />
    </div>
  );
}
