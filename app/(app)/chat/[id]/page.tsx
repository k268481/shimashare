import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getConversation,
  getOrCreateTransaction,
  listMessages,
  markConversationRead,
} from "@/lib/repos";
import { ChatRoom } from "./ChatRoom";

export default async function ChatDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const conversation = getConversation(params.id, user.id);
  if (!conversation) notFound();

  markConversationRead(params.id, user.id);
  const messages = listMessages(params.id);
  const transaction = getOrCreateTransaction(params.id, user.id)!;

  return (
    <ChatRoom
      conversation={conversation}
      initialMessages={messages}
      initialTransaction={transaction}
      currentUserId={user.id}
    />
  );
}
