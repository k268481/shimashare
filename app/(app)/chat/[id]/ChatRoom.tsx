"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import type { Conversation, Message } from "@/types";
import type { TransactionState } from "@/lib/repos";
import { cn, formatRelativeTime } from "@/lib/utils";

type Rating = "good" | "normal" | "bad";

const RATING_OPTIONS: { value: Rating; label: string; emoji: string }[] = [
  { value: "good", label: "よかった", emoji: "◎" },
  { value: "normal", label: "ふつう", emoji: "○" },
  { value: "bad", label: "よくなかった", emoji: "△" },
];

export function ChatRoom({
  conversation,
  initialMessages,
  initialTransaction,
  currentUserId,
}: {
  conversation: Conversation;
  initialMessages: Message[];
  initialTransaction: TransactionState;
  currentUserId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [tx, setTx] = React.useState<TransactionState>(initialTransaction);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const [showReview, setShowReview] = React.useState(false);
  const [rating, setRating] = React.useState<Rating | null>(null);
  const [reviewComment, setReviewComment] = React.useState("");

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  React.useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  // 新着メッセージのポーリング（簡易リアルタイム）
  React.useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        setMessages((prev) => {
          if (data.messages.length !== prev.length) {
            return data.messages as Message[];
          }
          return prev;
        });
        if (data.transaction) setTx(data.transaction as TransactionState);
      } catch {
        /* オフライン等は無視 */
      }
    };
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversation.id]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // 双方完了 & 自分が未評価なら評価モーダルを促す
  const bothCompleted = tx.sellerCompleted && tx.buyerCompleted;
  React.useEffect(() => {
    if (bothCompleted && !tx.myReviewDone) {
      setShowReview(true);
    }
  }, [bothCompleted, tx.myReviewDone]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    // 楽観的に追加
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUserId,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? (data.message as Message) : m)),
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    const myCompleted = conversation.sellerId === currentUserId
      ? tx.sellerCompleted
      : tx.buyerCompleted;
    const res = await fetch(`/api/conversations/${conversation.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !myCompleted }),
    });
    if (res.ok) {
      const data = await res.json();
      setTx(data.transaction as TransactionState);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) return;
    const res = await fetch(`/api/conversations/${conversation.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: reviewComment }),
    });
    if (res.ok || res.status === 409) {
      setTx((t) => ({ ...t, myReviewDone: true }));
      setShowReview(false);
      router.refresh();
    }
  };

  const myCompleted =
    conversation.sellerId === currentUserId ? tx.sellerCompleted : tx.buyerCompleted;
  const partnerCompleted =
    conversation.sellerId === currentUserId ? tx.buyerCompleted : tx.sellerCompleted;

  return (
    <>
      <div className="container-app flex h-[calc(100dvh-7rem)] flex-col py-4">
        <Link
          href="/chat"
          className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← チャット一覧へ
        </Link>

        <Card className="mb-3 shrink-0">
          <CardBody>
            <Link href={`/listings/${conversation.listingId}`} className="flex items-center gap-3">
              {conversation.listingPhoto && (
                <div
                  className="h-12 w-12 shrink-0 rounded-[6px] bg-background"
                  style={{
                    backgroundImage: `url(${conversation.listingPhoto})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{conversation.listingTitle}</p>
                <p className="text-sm text-text-secondary">
                  {conversation.partnerNickname}・{conversation.partnerLocation}
                </p>
              </div>
            </Link>
          </CardBody>
        </Card>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-3 py-2">
            {messages.map((m) => {
              const isSelf = m.senderId === currentUserId;
              return (
                <div key={m.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%]", isSelf ? "text-right" : "text-left")}>
                    {m.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt="添付画像"
                        className="mb-1 max-h-60 w-auto rounded-card object-contain"
                      />
                    )}
                    {m.text && (
                      <div
                        className={cn(
                          "inline-block rounded-card px-3 py-2 text-base leading-relaxed",
                          isSelf
                            ? "bg-primary text-white"
                            : "border border-border bg-surface text-text-primary",
                        )}
                      >
                        {m.text}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-text-secondary">
                      {formatRelativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <Card className="my-2 shrink-0">
          <CardBody className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-medium">
                {bothCompleted ? "取引完了しました 🎉" : "取引が終わったら"}
              </p>
              <p className="text-text-secondary">
                {bothCompleted
                  ? tx.myReviewDone
                    ? "評価ありがとうございました。"
                    : "相手を評価できます。"
                  : myCompleted && !partnerCompleted
                    ? "あなたは完了済み。相手の操作を待っています…"
                    : "双方が押すと取引完了。7日経過で自動完了。"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {bothCompleted ? (
                !tx.myReviewDone && (
                  <Button size="md" onClick={() => setShowReview(true)}>
                    評価する
                  </Button>
                )
              ) : (
                <Button
                  variant={myCompleted ? "secondary" : "primary"}
                  size="md"
                  onClick={handleComplete}
                >
                  {myCompleted ? "取消" : "取引しました"}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <form onSubmit={handleSend} className="flex shrink-0 items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder="メッセージを入力（Enterで送信）"
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || sending}>
            送信
          </Button>
        </form>
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl">
            <h2 className="font-display text-2xl">取引お疲れさまでした！</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {conversation.partnerNickname}さんへの評価をお願いします（スキップも可）。
            </p>

            <div className="mt-4 flex gap-3">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRating(opt.value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-card border-2 py-3 transition-colors",
                    rating === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-text-secondary hover:border-primary/50",
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="review-comment" hint="任意・最大200文字">
                コメント
              </Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="例：親切な方でした。また取引したいです。"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button variant="ghost" size="lg" onClick={() => setShowReview(false)}>
                スキップ
              </Button>
              <Button size="cta" fullWidth disabled={!rating} onClick={handleSubmitReview}>
                評価を送る
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
