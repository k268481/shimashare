import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getEmergencyMode,
  getReviewSummary,
  listListingsByUser,
} from "@/lib/repos";
import { logoutAction } from "@/lib/auth/actions";
import { setEmergencyAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { ProfileEditor } from "./ProfileEditor";
import { formatLocation } from "@/types";
import { formatRelativeTime, formatYen } from "@/lib/utils";

const RATING_LABEL: Record<"good" | "normal" | "bad", string> = {
  good: "◎ よかった",
  normal: "○ ふつう",
  bad: "△ よくなかった",
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const [myListings, reviews, mode] = await Promise.all([
    listListingsByUser(user.id),
    getReviewSummary(user.id),
    getEmergencyMode(),
  ]);

  return (
    <div className="container-app space-y-5 py-6">
      <h1 className="font-display text-3xl">マイページ</h1>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar name={user.nickname} size="lg" />
            <div className="flex-1">
              <p className="text-base font-medium">{user.nickname}</p>
              <p className="text-sm text-text-secondary">{formatLocation(user)}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {user.email}・登録：{formatRelativeTime(user.createdAt)}
              </p>
            </div>
            <ProfileEditor user={user} />
          </div>
        </CardBody>
      </Card>

      {/* 評価分布 */}
      <Card>
        <CardBody>
          <CardTitle as="h2" className="mb-3 text-xl">
            あなたへの評価
          </CardTitle>
          {reviews.total === 0 ? (
            <p className="text-sm text-text-secondary">まだ評価はありません。</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Chip variant="success">◎ {reviews.good}</Chip>
                <Chip>○ {reviews.normal}</Chip>
                <Chip variant="warning">△ {reviews.bad}</Chip>
                <span className="ml-auto text-sm text-text-secondary">計{reviews.total}件</span>
              </div>
              <ul className="divide-y divide-border">
                {reviews.recent
                  .filter((r) => r.comment)
                  .slice(0, 5)
                  .map((r, i) => (
                    <li key={i} className="py-2">
                      <p className="text-sm font-medium">{RATING_LABEL[r.rating]}</p>
                      <p className="text-sm text-text-secondary">{r.comment}</p>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      {/* わたしの出品 */}
      <section>
        <h2 className="mb-3 font-display text-2xl">わたしの出品</h2>
        {myListings.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-secondary">
              まだ出品はありません。
            </CardBody>
          </Card>
        ) : (
          <ul className="space-y-3">
            {myListings.map((l) => (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`}>
                  <Card hoverable>
                    <CardBody className="flex items-center gap-3">
                      <div
                        className="h-14 w-14 shrink-0 rounded-[6px] bg-background"
                        style={{
                          backgroundImage: l.photos[0] ? `url(${l.photos[0]})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium">{l.title}</p>
                        <p className="text-sm text-text-secondary">{formatYen(l.price)}</p>
                      </div>
                      <Chip variant={l.status === "active" ? "success" : "default"}>
                        {l.status === "active" ? "出品中" : l.status === "completed" ? "取引済" : l.status}
                      </Chip>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 緊急モード切替（スーパー管理者のみ） */}
      {user.role === "super_admin" && (
        <Card>
          <CardBody className="space-y-3">
            <CardTitle as="h2" className="text-xl">
              ⚙️ 緊急モード（管理者）
            </CardTitle>
            <p className="text-sm text-text-secondary">
              本番では気象庁APIが自動でON/OFFします。ここでは手動で強制切替できます（全ユーザーに反映）。
            </p>
            <div className="flex items-center gap-3">
              <Chip variant={mode.active ? "emergency" : "success"}>
                {mode.active ? "ON：台風モード" : "OFF：通常モード"}
              </Chip>
              <form action={setEmergencyAction}>
                <input type="hidden" name="active" value={mode.active ? "false" : "true"} />
                <Button variant={mode.active ? "secondary" : "primary"} type="submit">
                  {mode.active ? "通常モードに戻す" : "台風モードを起動"}
                </Button>
              </form>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ログアウト */}
      <form action={logoutAction} className="pt-2 text-center">
        <button type="submit" className="text-sm text-text-secondary hover:underline">
          ログアウト
        </button>
      </form>
    </div>
  );
}
