import { AlertCircle, Clock } from "lucide-react";
import { BrandHeader } from "@/components/ui/brand-header";

interface SharedErrorPageProps {
  status: 404 | 410;
  message?: string;
}

export function SharedErrorPage({ status, message }: SharedErrorPageProps) {
  const isExpired = status === 410;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <BrandHeader />

        <div className="bg-card border border-border rounded-lg p-8 shadow-lg space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {isExpired ? (
              <Clock className="h-16 w-16 text-orange-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-destructive" />
            )}

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {isExpired ? "分享链接已过期" : "分享链接不存在"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {message ||
                  (isExpired
                    ? "此分享链接已过期，无法访问。"
                    : "此分享链接不存在或已被删除。")}
              </p>
            </div>

            <div className="pt-4 space-y-2 text-xs text-muted-foreground">
              {isExpired ? (
                <>
                  <p>• 分享链接可能已超过有效期</p>
                  <p>• 请联系分享者重新创建分享链接</p>
                </>
              ) : (
                <>
                  <p>• 请检查链接是否完整</p>
                  <p>• 分享链接可能已被删除</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

