import { getSharedMessage } from "@/lib/shared-data";
import { SharedErrorPage } from "@/components/emails/shared-error-page";
import { SharedMessagePageClient } from "./page-client";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedMessagePage({ params }: PageProps) {
  const { token } = await params;

  // 获取分享的消息信息
  const message = await getSharedMessage(token);

  if (!message) {
    return <SharedErrorPage status={404} />;
  }

  return <SharedMessagePageClient message={message} />;
}

