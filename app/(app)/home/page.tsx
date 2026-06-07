import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmergencyMode, listListings, listStockAlerts } from "@/lib/repos";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { Chip } from "@/components/ui/Chip";
import { CATEGORY_LABELS, STOCK_STATUS_LABELS, formatLocation } from "@/types";
import { formatRelativeTime, formatYen } from "@/lib/utils";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const mode = getEmergencyMode();

  if (mode.active) {
    return <EmergencyHome warningText={mode.warningText} />;
  }
  return <NormalHome nickname={user.nickname} location={formatLocation(user!)} />;
}

function NormalHome({ nickname, location }: { nickname: string; location: string }) {
  const featured = listListings().slice(0, 4);

  return (
    <div className="container-app space-y-8 py-6">
      <section>
        <h1 className="font-display text-3xl">こんにちは、{nickname}さん</h1>
        <p className="mt-1 text-text-secondary">{location} / 今日も島でいい一日を。</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/listings">
          <Card hoverable className="h-full">
            <CardBody className="text-center">
              <div className="text-3xl" aria-hidden>
                🛒
              </div>
              <p className="mt-2 text-base font-medium">出品をみる</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/listings/new">
          <Card hoverable className="h-full">
            <CardBody className="text-center">
              <div className="text-3xl" aria-hidden>
                ✏️
              </div>
              <p className="mt-2 text-base font-medium">出品する</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/shops">
          <Card hoverable className="h-full">
            <CardBody className="text-center">
              <div className="text-3xl" aria-hidden>
                🏪
              </div>
              <p className="mt-2 text-base font-medium">店舗に取り寄せ</p>
            </CardBody>
          </Card>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">新着の出品</h2>
          <Link href="/listings" className="text-sm text-primary hover:underline">
            すべて見る →
          </Link>
        </div>
        {featured.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-secondary">
              まだ出品はありません。最初の出品をしてみましょう。
            </CardBody>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featured.map((l) => (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`}>
                  <Card hoverable className="h-full">
                    <div
                      className="h-40 w-full bg-background"
                      style={{
                        backgroundImage: l.photos[0] ? `url(${l.photos[0]})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-hidden
                    />
                    <CardBody>
                      <div className="flex items-center gap-2">
                        <Chip>{CATEGORY_LABELS[l.category]}</Chip>
                        {l.price === 0 && <Chip variant="success">ゆずります</Chip>}
                      </div>
                      <CardTitle className="mt-2 line-clamp-1 text-lg">{l.title}</CardTitle>
                      <p className="mt-1 text-base font-medium">{formatYen(l.price)}</p>
                      <p className="mt-2 text-sm text-text-secondary">
                        {l.userNickname}・{l.userLocation}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmergencyHome({ warningText }: { warningText?: string }) {
  const freeOffers = listListings({ freeOnly: true });
  const recentAlerts = listStockAlerts().slice(0, 4);

  return (
    <div className="container-app space-y-6 py-6">
      <section>
        <Banner tone="emergency">
          台風モード起動中：{warningText ?? "暴風警報発令中"}。
          助け合いを優先する画面に切り替えています。
        </Banner>
      </section>

      <section>
        <h1 className="font-display text-3xl">困っている人へ。</h1>
        <p className="mt-1 text-text-secondary">
          家にある余分なものを0円で出品して、近所の人を助けられます。
        </p>
        <Link href="/listings/new?free=1" className="mt-4 inline-block">
          <Button size="cta" className="px-8">
            ゆずります（0円）で出品する
          </Button>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">「これがない」掲示板</h2>
          <Link href="/emergency" className="text-sm text-primary hover:underline">
            すべて見る →
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-secondary">
              まだ投稿はありません。
            </CardBody>
          </Card>
        ) : (
          <ul className="space-y-3">
            {recentAlerts.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardBody>
                    <div className="flex items-center gap-2">
                      <Chip
                        variant={
                          a.status === "out_of_stock"
                            ? "error"
                            : a.status === "restocked"
                              ? "success"
                              : "warning"
                        }
                      >
                        {STOCK_STATUS_LABELS[a.status]}
                      </Chip>
                      <span className="text-sm text-text-secondary">
                        {formatRelativeTime(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-medium">{a.item}</p>
                    {a.shopName && (
                      <p className="text-sm text-text-secondary">
                        {a.shopName}（{a.location}）
                      </p>
                    )}
                    {a.comment && <p className="mt-1 text-sm">{a.comment}</p>}
                    <p className="mt-2 text-xs text-text-secondary">投稿：{a.userNickname}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">
          ゆずります（0円）
          <span className="ml-2 text-sm font-normal text-text-secondary">
            {freeOffers.length}件
          </span>
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {freeOffers.map((l) => (
            <li key={l.id}>
              <Link href={`/listings/${l.id}`}>
                <Card hoverable className="h-full">
                  <div
                    className="h-32 w-full bg-background"
                    style={{
                      backgroundImage: l.photos[0] ? `url(${l.photos[0]})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    aria-hidden
                  />
                  <CardBody>
                    <Chip variant="success">ゆずります</Chip>
                    <CardTitle className="mt-2 line-clamp-1 text-lg">{l.title}</CardTitle>
                    <p className="mt-1 text-sm text-text-secondary">
                      {l.userNickname}・{l.userLocation}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
