import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listConversationsForUser } from "@/lib/repos";
import { Card, CardBody } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";

export default async function ChatListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const conversations = await listConversationsForUser(user.id);

  return (
    <div className="container-app space-y-5 py-6">
      <h1 className="font-display text-3xl">チャット</h1>

      {conversations.length === 0 ? (
        <Card>
          <CardBody className="text-center text-text-secondary">
            まだチャットはありません。出品の「連絡する」から始まります。
          </CardBody>
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/chat/${c.id}`} className="block hover:bg-background">
                <div className="flex items-start gap-3 px-4 py-3">
                  {c.listingPhoto ? (
                    <div
                      className="h-14 w-14 shrink-0 rounded-[6px] bg-background"
                      style={{
                        backgroundImage: `url(${c.listingPhoto})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-hidden
                    />
                  ) : (
                    <Avatar name={c.partnerNickname} size="lg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-medium">
                        {c.partnerNickname}
                        <span className="ml-2 text-xs font-normal text-text-secondary">
                          {c.partnerLocation}
                        </span>
                      </p>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {c.lastMessageAt && formatRelativeTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-text-secondary">{c.listingTitle}</p>
                    <p className="mt-1 line-clamp-1 text-sm">{c.lastMessage ?? "（メッセージなし）"}</p>
                  </div>
                  {(c.unreadCount ?? 0) > 0 && (
                    <Chip variant="active" className="shrink-0">
                      {c.unreadCount}
                    </Chip>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
