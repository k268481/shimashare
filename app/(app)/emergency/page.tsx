import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmergencyMode, listStockAlerts } from "@/lib/repos";
import { createStockAlertAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";
import { STOCK_STATUS_LABELS, formatLocation, type StockStatus } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export default async function EmergencyBoardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const mode = getEmergencyMode();
  const alerts = listStockAlerts();
  const myLocation = formatLocation(user);

  return (
    <div className="container-app space-y-5 py-6">
      <h1 className="font-display text-3xl">「これがない」掲示板</h1>
      <p className="text-text-secondary">
        島内の在庫情報を共有しよう。古い投稿（24時間以上）は薄く表示されます。
      </p>

      {!mode.active && (
        <Banner tone="info">
          現在は通常モードです。緊急（台風）モード時に効果を発揮しますが、平常時の投稿も可能です。
        </Banner>
      )}

      <Card>
        <CardBody>
          <CardTitle as="h2" className="mb-3 text-xl">
            投稿する
          </CardTitle>
          <form action={createStockAlertAction} className="space-y-3">
            <div>
              <Label htmlFor="item" required>品目</Label>
              <Input id="item" name="item" placeholder="例：ペットボトル水（2L）" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status" required>状態</Label>
                <Select id="status" name="status" defaultValue="out_of_stock">
                  {(Object.keys(STOCK_STATUS_LABELS) as StockStatus[]).map((s) => (
                    <option key={s} value={s}>{STOCK_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="location" hint="自動入力">場所</Label>
                <Input id="location" name="location" defaultValue={myLocation} placeholder="例：沖縄県石垣市" />
              </div>
            </div>
            <div>
              <Label htmlFor="shopName" hint="任意">店舗名</Label>
              <Input id="shopName" name="shopName" placeholder="例：離島スーパー石垣店" />
            </div>
            <div>
              <Label htmlFor="comment" hint="任意">コメント</Label>
              <Textarea id="comment" name="comment" rows={2} placeholder="例：18時時点で残り少なめ" />
            </div>
            <Button type="submit" size="cta" fullWidth>掲示板に投稿</Button>
          </form>
        </CardBody>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-2xl">最近の投稿</h2>
        {alerts.length === 0 ? (
          <Card>
            <CardBody className="text-center text-text-secondary">まだ投稿はありません。</CardBody>
          </Card>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => {
              const isStale = Date.now() - new Date(a.createdAt).getTime() > 24 * 60 * 60_000;
              return (
                <li key={a.id}>
                  <Card className={cn(isStale && "opacity-50")}>
                    <CardBody>
                      <div className="flex items-center gap-2">
                        <Chip variant={a.status === "out_of_stock" ? "error" : a.status === "restocked" ? "success" : "warning"}>
                          {STOCK_STATUS_LABELS[a.status]}
                        </Chip>
                        <span className="text-sm text-text-secondary">{formatRelativeTime(a.createdAt)}</span>
                        {isStale && <span className="ml-auto text-xs text-text-secondary">24h経過</span>}
                      </div>
                      <p className="mt-2 text-base font-medium">{a.item}</p>
                      <p className="text-sm text-text-secondary">
                        {a.shopName ? `${a.shopName}（${a.location}）` : a.location}
                      </p>
                      {a.comment && <p className="mt-1 text-sm">{a.comment}</p>}
                      <p className="mt-2 text-xs text-text-secondary">投稿：{a.userNickname}</p>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
