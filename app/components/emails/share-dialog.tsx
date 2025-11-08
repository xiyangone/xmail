"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Trash2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EXPIRY_OPTIONS } from "@/types/email";

interface ShareDialogProps {
  emailId: string;
  emailAddress: string;
}

interface ShareLink {
  id: string;
  token: string;
  createdAt: number | string | Date;
  expiresAt: number | string | Date | null;
  enabled: boolean;
}

export function ShareDialog({ emailId }: ShareDialogProps) {
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();

  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiryTime, setExpiryTime] = useState(
    EXPIRY_OPTIONS[1].value.toString()
  );
  const [deleteTarget, setDeleteTarget] = useState<ShareLink | null>(null);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/emails/${emailId}/share`);
      if (!response.ok) throw new Error("Failed to fetch shares");

      const data = (await response.json()) as { shares: ShareLink[] };
      setShares(data.shares || []);
    } catch (error) {
      console.error("Failed to fetch shares:", error);
      toast({
        title: "获取分享链接失败",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createShare = async () => {
    try {
      setCreating(true);
      const response = await fetch(`/api/emails/${emailId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: Number(expiryTime) }),
      });

      if (!response.ok) throw new Error("Failed to create share");

      const share = (await response.json()) as ShareLink;
      setShares((prev) => [share, ...prev]);

      toast({
        title: "分享链接创建成功",
      });
    } catch (error) {
      console.error("Failed to create share:", error);
      toast({
        title: "创建分享链接失败",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteShare = async (share: ShareLink) => {
    try {
      const response = await fetch(
        `/api/emails/${emailId}/share/${share.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete share");

      setShares((prev) => prev.filter((s) => s.id !== share.id));

      toast({
        title: "分享链接已删除",
      });
    } catch (error) {
      console.error("Failed to delete share:", error);
      toast({
        title: "删除分享链接失败",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared/${token}`;
  };

  const handleCopy = async (token: string) => {
    const url = getShareUrl(token);
    const success = await copyToClipboard(url);

    if (success) {
      toast({
        title: "链接已复制",
      });
    } else {
      toast({
        title: "复制失败",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchShares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-[600px]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (deleteTarget) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>分享邮箱</DialogTitle>
            <DialogDescription>创建分享链接，让其他人可以查看此邮箱中的邮件</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create new share link */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">链接有效期</Label>
              <div className="flex gap-2">
                <Select value={expiryTime} onValueChange={setExpiryTime}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={createShare}
                  disabled={creating}
                  className="min-w-[100px]"
                >
                  {creating ? "创建中..." : "创建链接"}
                </Button>
              </div>
            </div>

            {/* Active share links */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">当前分享链接</Label>
              <div className="h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="text-sm text-gray-500 text-center py-12 flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>加载中...</span>
                  </div>
                ) : shares.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-12 flex flex-col items-center gap-3">
                    <div className="text-4xl">📭</div>
                    <div>
                      <div className="font-medium mb-1">暂无分享链接</div>
                      <div className="text-xs text-muted-foreground">创建链接后将在此显示</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {shares.map((share) => {
                      const expiresAtTime = share.expiresAt
                        ? typeof share.expiresAt === "number"
                          ? share.expiresAt
                          : new Date(share.expiresAt).getTime()
                        : null;
                      const isExpired =
                        expiresAtTime !== null && expiresAtTime < Date.now();
                      return (
                        <div
                          key={share.id}
                          className={cn(
                            "p-3 border rounded-lg space-y-2.5 transition-all",
                            isExpired
                              ? "border-destructive/30 bg-destructive/5"
                              : "border-border bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Link2
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isExpired
                                  ? "text-destructive/60"
                                  : "text-primary"
                              )}
                            />
                            <a
                              href={
                                isExpired ? undefined : getShareUrl(share.token)
                              }
                              target={isExpired ? undefined : "_blank"}
                              rel={
                                isExpired ? undefined : "noopener noreferrer"
                              }
                              onClick={(e) => {
                                if (isExpired) {
                                  e.preventDefault();
                                }
                              }}
                              className={cn(
                                "flex-1 text-xs p-2 rounded truncate font-mono transition-colors",
                                isExpired
                                  ? "bg-destructive/10 text-destructive/70 cursor-not-allowed"
                                  : "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                              )}
                            >
                              {getShareUrl(share.token)}
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => handleCopy(share.token)}
                              disabled={isExpired}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(share)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex gap-4">
                              <span>
                                创建时间:{" "}
                                {new Date(
                                  typeof share.createdAt === "number"
                                    ? share.createdAt
                                    : share.createdAt
                                ).toLocaleString("zh-CN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              <span>
                                过期时间:{" "}
                                {share.expiresAt
                                  ? new Date(
                                      typeof share.expiresAt === "number"
                                        ? share.expiresAt
                                        : share.expiresAt
                                    ).toLocaleString("zh-CN", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })
                                  : "永久"}
                              </span>
                            </div>
                            {isExpired && (
                              <span className="text-destructive font-medium flex items-center gap-1">
                                <span className="w-2 h-2 bg-destructive rounded-full"></span>
                                已过期
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个分享链接吗？删除后该链接将无法访问。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteShare(deleteTarget)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

