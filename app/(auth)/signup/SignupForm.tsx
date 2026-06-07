"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signupAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardBody } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="cta" fullWidth disabled={pending}>
      {pending ? "登録中…" : "登録してはじめる"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signupAction, {});

  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="font-display text-2xl">新規登録</h2>
        <p className="text-sm text-text-secondary">
          メールアドレスで登録します。試験運用（MVP）期間中です。
        </p>

        {state?.error && <Banner tone="warning">{state.error}</Banner>}

        <form action={formAction} className="space-y-4">
          {/* ログイン情報 */}
          <div>
            <Label htmlFor="email" required>メールアドレス</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="password" required hint="8文字以上">パスワード</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div>
              <Label htmlFor="passwordConfirm" required>パスワード（確認）</Label>
              <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
            </div>
          </div>

          {/* 公開プロフィール */}
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm text-text-secondary">
              他の利用者に表示されるのは <strong>ニックネーム</strong> と <strong>地域</strong> のみです。
            </p>
            <div className="mb-3">
              <Label htmlFor="nickname" required>ニックネーム</Label>
              <Input id="nickname" name="nickname" placeholder="例：しまちゃん" maxLength={20} required />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="prefecture" required>都道府県</Label>
                <Input id="prefecture" name="prefecture" placeholder="例：沖縄県" required />
              </div>
              <div>
                <Label htmlFor="city" required>市区町村</Label>
                <Input id="city" name="city" placeholder="例：石垣市" required />
              </div>
            </div>

            <div className="mt-3">
              <Label htmlFor="island" hint="任意">島の名前</Label>
              <Input id="island" name="island" placeholder="例：石垣島、西表島（市外離島の場合）" />
              <p className="mt-1 text-xs text-text-secondary">
                市区町村と別に島名を記載したい場合に入力してください。
              </p>
            </div>
          </div>

          {/* 運営にのみ伝える情報（任意） */}
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm text-text-secondary">
              以下は<strong>運営のみ閲覧</strong>（他の利用者には非表示）。後でマイページから登録も可能です。
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="realName" hint="任意">お名前（本名）</Label>
                <Input id="realName" name="realName" placeholder="例：島袋 ひゅうま" />
              </div>
              <div>
                <Label htmlFor="phone" hint="任意">電話番号</Label>
                <Input id="phone" name="phone" type="tel" placeholder="090-1234-5678" />
              </div>
            </div>
          </div>

          {/* 同意 */}
          <div className="space-y-2 border-t border-border pt-4">
            <Checkbox
              name="agreeTerms"
              label={<>
                <a href="#terms" className="text-primary underline">利用規約</a>・
                <a href="#privacy" className="text-primary underline">プライバシーポリシー</a>に同意します
              </>}
            />
            <Checkbox name="isAdult" label="18歳以上です" />
            <Checkbox name="proxyForHousehold" label="同世帯の家族の代わりに操作することがあります" />
          </div>

          <SubmitButton />
        </form>

        <p className="text-center text-sm text-text-secondary">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-primary underline">ログイン</Link>
        </p>
      </CardBody>
    </Card>
  );
}
