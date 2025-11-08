import { getSharedEmail, getSharedEmailMessages } from "@/lib/shared-data";
import { SharedErrorPage } from "@/components/emails/shared-error-page";
import { SharedEmailPageClient } from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedEmailPage({ params }: PageProps) {
  const { token } = await params;

  // 获取分享的邮箱信息
  const email = await getSharedEmail(token);

  if (!email) {
    return <SharedErrorPage status={404} />;
  }

  // 获取初始消息列表
  const initialData = await getSharedEmailMessages(token, 20);

  return (
    <SharedEmailPageClient
      email={email}
      initialMessages={initialData.messages}
      initialNextCursor={initialData.nextCursor}
      initialTotal={initialData.total}
      token={token}
    />
  );
}

