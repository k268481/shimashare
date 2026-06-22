import Link from "next/link";
import { notFound } from "next/navigation";
import { getShop } from "@/lib/repos";
import { createShopRequestAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";

export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sent?: string };
}) {
  const shop = await getShop(params.id);
  if (!shop) notFound();
  const sent = searchParams.sent === "1";

  return (
    <div className="container-app space-y-5 py-6">
      <Link
        href="/shops"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        ← 店舗一覧へ
      </Link>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle as="h1" className="text-2xl">
              {shop.name}
            </CardTitle>
            <Chip variant={shop.responseChannel === "line" ? "active" : "default"}>
              {shop.responseChannel === "line" ? "LINE対応" : "電話のみ"}
            </Chip>
          </div>
          <p className="text-sm text-text-secondary">
            {shop.location}・{shop.openingHours}
          </p>
          {shop.address && <p className="text-sm text-text-secondary">{shop.address}</p>}
          <p className="text-sm">{shop.itemsDescription}</p>

          <div className="border-t border-border pt-3">
            <a
              href={`tel:${shop.phone}`}
              className="inline-flex min-h-tap items-center gap-2 text-base font-medium text-primary hover:underline"
            >
              ☎️ {shop.phone} に電話する
            </a>
          </div>
        </CardBody>
      </Card>

      {shop.responseChannel === "line" ? (
        <Card>
          <CardBody className="space-y-4">
            <CardTitle as="h2">取り寄せをお願いする</CardTitle>
            <p className="text-sm text-text-secondary">
              送信すると、店舗のLINEにメッセージが届きます。返事はアプリ内で通知されます。
            </p>

            {sent ? (
              <Banner tone="info">
                ✅ リクエストを送信しました。返事が来たらお知らせします。
              </Banner>
            ) : (
              <form action={createShopRequestAction} className="space-y-4">
                <input type="hidden" name="shopId" value={shop.id} />
                <div>
                  <Label htmlFor="item" required>
                    取り寄せたい品目
                  </Label>
                  <Input
                    id="item"
                    name="item"
                    placeholder="例：5kg米、子ども用紙オムツMサイズ"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" required>
                    数量
                  </Label>
                  <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
                </div>
                <div>
                  <Label htmlFor="note" hint="任意・最大300文字">
                    希望日時・備考
                  </Label>
                  <Textarea
                    id="note"
                    name="note"
                    rows={3}
                    maxLength={300}
                    placeholder="例：今週水曜までに用意していただけると助かります"
                  />
                </div>
                <Button type="submit" size="cta" fullWidth>
                  LINEで取り寄せをお願いする
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      ) : (
        <Banner tone="warning">
          このお店は電話での問い合わせのみ対応しています。上の電話番号からお願いします。
        </Banner>
      )}
    </div>
  );
}
