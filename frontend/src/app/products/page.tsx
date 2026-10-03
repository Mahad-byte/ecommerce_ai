import { ProductsBrowser } from "./products-browser";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;
  const raw = params.category;
  const category = typeof raw === "string" && raw ? raw : null;
  return <ProductsBrowser initialCategory={category} />;
}
