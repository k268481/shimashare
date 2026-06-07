"use client";

import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CATEGORY_LABELS, type Category, type Listing } from "@/types";
import { formatRelativeTime, formatYen } from "@/lib/utils";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "food", label: "食品" },
  { value: "daily", label: "日用品" },
  { value: "clothing", label: "衣類" },
  { value: "baby", label: "ベビー" },
  { value: "appliance", label: "家電・道具" },
  { value: "other", label: "その他" },
];

export function ListingsBrowser({
  listings,
  freeOnly,
}: {
  listings: Listing[];
  freeOnly: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = React.useState<Category | "all">("all");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    let items = listings;
    if (selectedCategory !== "all") {
      items = items.filter((l) => l.category === selectedCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
      );
    }
    return items;
  }, [listings, selectedCategory, query]);

  return (
    <div className="container-app space-y-5 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">{freeOnly ? "ゆずります（0円）" : "出品一覧"}</h1>
        <Link href="/listings/new">
          <Button>＋ 出品する</Button>
        </Link>
      </header>

      <Input
        type="search"
        placeholder="キーワードで検索（例：水、紙オムツ）"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="カテゴリ">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            role="tab"
            aria-selected={selectedCategory === c.value}
            onClick={() => setSelectedCategory(c.value)}
          >
            <Chip variant={selectedCategory === c.value ? "active" : "default"}>{c.label}</Chip>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-secondary">
            条件に合う出品が見つかりませんでした。
          </CardBody>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((l) => (
            <li key={l.id}>
              <Link href={`/listings/${l.id}`}>
                <Card hoverable className="h-full">
                  <div
                    className="h-44 w-full bg-background"
                    style={{
                      backgroundImage: l.photos[0] ? `url(${l.photos[0]})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    aria-hidden
                  />
                  <CardBody>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip>{CATEGORY_LABELS[l.category]}</Chip>
                      {l.price === 0 && <Chip variant="success">ゆずります</Chip>}
                    </div>
                    <CardTitle className="mt-2 line-clamp-2 text-lg">{l.title}</CardTitle>
                    <p className="mt-1 text-base font-medium">{formatYen(l.price)}</p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {l.userNickname}・{l.userLocation}・{formatRelativeTime(l.createdAt)}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
