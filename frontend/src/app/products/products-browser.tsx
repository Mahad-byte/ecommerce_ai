"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Category, PaginatedProducts, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PAGE_SIZE = 24;

const SORT_ITEMS = [
  { value: "-created_at", label: "Newest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "name", label: "Name: A–Z" },
  { value: "-name", label: "Name: Z–A" },
];

interface ProductQuery {
  page: number;
  search: string;
  category: string | null;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
}

export function ProductsBrowser({
  initialCategory,
}: {
  initialCategory: string | null;
}) {
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    search: "",
    category: initialCategory,
    minPrice: "",
    maxPrice: "",
    inStock: false,
    sort: "-created_at",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  function update(patch: Partial<ProductQuery>) {
    setQuery((q) => ({ ...q, page: 1, ...patch }));
  }

  function goToPage(page: number) {
    setQuery((q) => ({ ...q, page }));
  }

  const hasFilters =
    !!query.search ||
    !!query.category ||
    !!query.minPrice ||
    !!query.maxPrice ||
    query.inStock;

  useEffect(() => {
    let ignore = false;
    api
      .get<Category[]>("/categories/")
      .then((res) => {
        if (!ignore) setCategories(res.data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (ignore) return;
      setLoading(true);
      const params: Record<string, string> = { page: String(query.page) };
      if (query.search.trim()) params.search = query.search.trim();
      if (query.category) params.category = query.category;
      if (query.minPrice) params.min_price = query.minPrice;
      if (query.maxPrice) params.max_price = query.maxPrice;
      if (query.inStock) params.in_stock = "true";
      if (query.sort) params.ordering = query.sort;
      api
        .get<PaginatedProducts>("/products/", { params })
        .then((res) => {
          if (!ignore) {
            setProducts(res.data.results);
            setCount(res.data.count);
          }
        })
        .catch(() => {
          if (!ignore) setProducts([]);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const activeCategory = categories.find((c) => c.slug === query.category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeCategory ? activeCategory.name : "All products"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${count} products`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search products…"
              value={query.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-52"
            />
            <Select
              items={SORT_ITEMS}
              value={query.sort}
              onValueChange={(value) => update({ sort: value as string })}
            >
              <SelectTrigger className="w-44" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_ITEMS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              items={categoryItems(categories)}
              value={query.category ?? "all"}
              onValueChange={(value) =>
                update({ category: value === "all" ? null : (value as string) })
              }
            >
              <SelectTrigger className="w-44" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min="0"
                placeholder="Min"
                value={query.minPrice}
                onChange={(e) => update({ minPrice: e.target.value })}
                className="h-9 w-24 pl-6"
              />
            </div>
            <span className="text-muted-foreground">–</span>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min="0"
                placeholder="Max"
                value={query.maxPrice}
                onChange={(e) => update({ maxPrice: e.target.value })}
                className="h-9 w-24 pl-6"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={query.inStock}
              onCheckedChange={(checked) => update({ inStock: checked })}
              aria-label="In stock only"
            />
            In stock only
          </label>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() =>
                setQuery({
                  page: 1,
                  search: "",
                  category: null,
                  minPrice: "",
                  maxPrice: "",
                  inStock: false,
                  sort: query.sort,
                })
              }
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {!loading && products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-1 text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              ))
            : products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={query.page <= 1 || loading}
            onClick={() => goToPage(Math.max(1, query.page - 1))}
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {query.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={query.page >= totalPages || loading}
            onClick={() => goToPage(Math.min(totalPages, query.page + 1))}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

function categoryItems(categories: Category[]) {
  return [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];
}
