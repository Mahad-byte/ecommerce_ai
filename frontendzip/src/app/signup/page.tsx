"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const username = form.get("username") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      await api.post("/auth/register/", { username, email, password });
    } catch (err) {
      setSubmitting(false);
      const data = (err as { response?: { data?: Record<string, string[]> } })
        .response?.data;
      const first = data
        ? Object.values(data).flat()[0]
        : "Registration failed. Please try again.";
      setError(first ?? "Registration failed. Please try again.");
      return;
    }

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Sign up to start shopping.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, not too common.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-foreground">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
