"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="cta" fullWidth disabled={pending}>
      {pending ? "ログイン中…" : "ログイン"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(loginAction, {});

  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="font-display text-2xl">ログイン</h2>

        {state?.error && <Banner tone="warning">{state.error}</Banner>}

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email" required>
              メールアドレス
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" required>
              パスワード
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="8文字以上"
              required
            />
          </div>
          <SubmitButton />
        </form>

        <p className="text-center text-sm text-text-secondary">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-primary underline">
            新規登録
          </Link>
        </p>

        <div className="rounded-card border border-border bg-background p-3 text-xs text-text-secondary">
          <p className="font-medium text-text-primary">体験用アカウント</p>
          <p className="mt-1">メール：shimachan@example.com</p>
          <p>パスワード：password123</p>
          <p className="mt-1">（管理者を試す場合：admin@example.com）</p>
        </div>
      </CardBody>
    </Card>
  );
}
