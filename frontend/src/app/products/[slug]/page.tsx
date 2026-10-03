import { ProductDetail } from "./product-detail";

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  return <ProductDetail key={slug} slug={slug} />;
}
