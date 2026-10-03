import { VerifyOrder } from "./verify-order";

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  const raw = (await searchParams).orderId;
  const orderId = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  return <VerifyOrder orderId={orderId} />;
}
