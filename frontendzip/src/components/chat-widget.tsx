"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { ChatResponse, Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm ShopAI. Ask me anything about our products — I can help you find the right item.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send() {
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setSending(true);

    try {
      const res = await api.post<ChatResponse>("/chat/", { message });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.reply, products: res.data.products },
      ]);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail ?? "Something went wrong. Please try again.";
      setError(detail);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <Card className="flex h-[520px] w-[min(380px,calc(100vw-2rem))] flex-col gap-0 p-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b py-3">
            <CardTitle className="text-base">ShopAI Assistant</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </Button>
          </CardHeader>
          <CardContent
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto py-4"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
                }
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg border bg-background p-2 transition-colors hover:bg-accent"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {product.image_url && (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {product.name}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                            {product.stock === 0 && (
                              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                Out
                              </Badge>
                            )}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="w-20 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                Thinking…
              </div>
            )}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </CardContent>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products…"
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={sending || !input.trim()}>
              Send
            </Button>
          </form>
        </Card>
      )}

      <Button
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-12 rounded-full text-lg shadow-lg"
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </Button>
    </div>
  );
}
