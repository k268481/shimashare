"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import type { User } from "@/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中…" : "保存する"}
    </Button>
  );
}

export function ProfileEditor({ user }: { user: User }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<AuthState, FormData>(updateProfileAction, {});
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (state && !state.error && saved) {
      const t = setTimeout(() => setOpen(false), 800);
      return () => clearTimeout(t);
    }
  }, [state, saved]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
        編集
      </button>
    );
  }

  return (
    <form
      action={(fd) => { setSaved(true); formAction(fd); }}
      className="mt-4 space-y-3 border-t border-border pt-4"
    >
      {state?.error && <Banner tone="warning">{state.error}</Banner>}
      {state && !state.error && saved && <Banner tone="info">保存しました。</Banner>}

      <div>
        <Label htmlFor="nickname" required>ニックネーム</Label>
        <Input id="nickname" name="nickname" defaultValue={user.nickname} required />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="prefecture" required>都道府県</Label>
          <Input id="prefecture" name="prefecture" defaultValue={user.prefecture} placeholder="例：沖縄県" required />
        </div>
        <div>
          <Label htmlFor="city" required>市区町村</Label>
          <Input id="city" name="city" defaultValue={user.city} placeholder="例：石垣市" required />
        </div>
      </div>

      <div>
        <Label htmlFor="island" hint="任意">島の名前</Label>
        <Input id="island" name="island" defaultValue={user.island ?? ""} placeholder="例：石垣島" />
      </div>

      <p className="text-xs text-text-secondary">以下は運営のみ閲覧（他の利用者には非表示）。</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="realName" hint="任意">お名前（本名）</Label>
          <Input id="realName" name="realName" defaultValue={user.realName ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone" hint="任意">電話番号</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>閉じる</Button>
        <SaveButton />
      </div>
    </form>
  );
}
