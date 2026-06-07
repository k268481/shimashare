"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { createListingAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { CATEGORY_LABELS, type Category } from "@/types";

const FORBIDDEN_KEYWORDS = ["薬", "医薬", "たばこ", "タバコ", "煙草"];
const WARN_KEYWORDS = ["生鮮", "刺身", "自家製"];
const MAX_PHOTOS = 4;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="cta" fullWidth disabled={disabled || pending}>
      {pending ? "出品中…" : "出品する"}
    </Button>
  );
}

export default function NewListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFreeDefault = searchParams.get("free") === "1";

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priceText, setPriceText] = React.useState(isFreeDefault ? "0" : "");
  const [isFree, setIsFree] = React.useState(isFreeDefault);
  const [category, setCategory] = React.useState<Category>("daily");
  const [handover, setHandover] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const parsedPrice = isFree ? 0 : Math.max(0, parseInt(priceText || "0", 10) || 0);

  const warning = React.useMemo(() => {
    const text = `${title} ${description}`;
    if (FORBIDDEN_KEYWORDS.some((k) => text.includes(k))) {
      return {
        kind: "error" as const,
        message: "禁止品目に該当する可能性があります。出品できません。",
      };
    }
    if (WARN_KEYWORDS.some((k) => text.includes(k))) {
      return {
        kind: "warning" as const,
        message:
          "生鮮品・自家製品の取引は自己責任となります。受け渡しの方法と状態を必ず説明文に記載してください。",
      };
    }
    return null;
  }, [title, description]);

  const canSubmit =
    title.trim().length > 0 && handover.trim().length > 0 && warning?.kind !== "error";

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") setPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={createListingAction} className="container-app space-y-5 py-6">
      {/* 写真はクライアントstateなのでhiddenで送る */}
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <h1 className="font-display text-3xl">出品する</h1>
      <p className="text-sm text-text-secondary">
        出品＝売りに出すこと。0円にすると「ゆずります」になります。
      </p>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="title" required>
              タイトル
            </Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：未開封のトイレットペーパー12ロール"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="category" required>
              カテゴリ
            </Label>
            <Select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="description" hint="任意・最大500文字">
              説明
            </Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="状態、使用期間、受け渡しの注意点など"
            />
          </div>

          <div>
            <Label htmlFor="price" required>
              価格（円）
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="price"
                name="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={isFree ? "0" : priceText}
                disabled={isFree}
                onChange={(e) => setPriceText(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="例：500"
                className="flex-1"
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-base">
                <input
                  type="checkbox"
                  name="isFree"
                  className="h-5 w-5"
                  checked={isFree}
                  onChange={(e) => {
                    setIsFree(e.target.checked);
                    if (e.target.checked) setPriceText("0");
                  }}
                />
                ゆずります（0円）
              </label>
            </div>
            {!isFree && priceText !== "" && (
              <p className="mt-1 text-sm text-text-secondary">
                ¥{parsedPrice.toLocaleString("ja-JP")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="handover" required hint="例：水曜の夕方 上嶺地区集会所近くで">
              受け渡しの希望
            </Label>
            <Textarea
              id="handover"
              name="handover"
              value={handover}
              onChange={(e) => setHandover(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label hint={`最大${MAX_PHOTOS}枚`}>写真</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handlePhotoSelect}
              aria-label="写真を選択"
            />
            <div className="grid grid-cols-4 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`写真${i + 1}`}
                    className="h-full w-full rounded-card object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                    aria-label={`写真${i + 1}を削除`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-card border-2 border-dashed border-border text-2xl text-text-secondary hover:border-primary hover:text-primary"
                  aria-label="写真を追加"
                >
                  ＋
                </button>
              )}
            </div>
            {photos.length === 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                タップして写真を追加してください（必須ではありません）
              </p>
            )}
          </div>

          {warning && (
            <Banner tone={warning.kind === "error" ? "emergency" : "warning"}>
              {warning.message}
            </Banner>
          )}
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" size="cta" onClick={() => router.back()} type="button">
          戻る
        </Button>
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}
