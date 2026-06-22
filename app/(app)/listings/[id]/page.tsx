import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getListing } from "@/lib/repos";
import { startChatAction, deleteListingAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";
import { Avatar } from "@/components/ui/Avatar";
import { CATEGORY_LABELS } from "@/types";
import { formatRelativeTime, formatYen } from "@/lib/utils";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const isOwn = listing.userId === user.id;

  return (
    <div className="container-app space-y-5 py-6">
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        ← 出品一覧へ
      </Link>

      <Card>
        <div
          className="h-72 w-full bg-background"
          style={{
            backgroundImage: listing.photos[0] ? `url(${listing.photos[0]})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{CATEGORY_LABELS[listing.category]}</Chip>
            {listing.price === 0 && <Chip variant="success">ゆずります（0円）</Chip>}
          </div>
          <CardTitle as="h1" className="text-2xl">
            {listing.title}
          </CardTitle>
          <p className="text-2xl font-bold">{formatYen(listing.price)}</p>
          {listing.description && (
            <p className="whitespace-pre-wrap text-base text-text-primary">{listing.description}</p>
          )}

          <div className="rounded-card border border-border bg-background p-3 text-sm">
            <p className="font-medium text-text-primary">受け渡しの希望</p>
            <p className="mt-1 text-text-secondary">{listing.handover}</p>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Avatar name={listing.userNickname} />
            <div className="flex-1">
              <p className="text-base font-medium">{listing.userNickname}</p>
              <p className="text-sm text-text-secondary">
                {listing.userLocation}・{formatRelativeTime(listing.createdAt)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {listing.category === "food" && (
        <Banner tone="warning">
          ⚠ 生鮮食品・自家製食品は自己責任での取引となります。状態をよく確認してください。
        </Banner>
      )}

      {!isOwn ? (
        <form action={startChatAction}>
          <input type="hidden" name="listingId" value={listing.id} />
          <Button type="submit" size="cta" fullWidth>
            この出品について連絡する
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <Banner tone="info">これはあなたの出品です。</Banner>
          <form action={deleteListingAction}>
            <input type="hidden" name="listingId" value={listing.id} />
            <Button type="submit" size="cta" fullWidth variant="destructive">
              削除する
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
