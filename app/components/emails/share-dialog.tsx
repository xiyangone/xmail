"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Trash2, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatZhCnDateTime } from "@/lib/format-zh-cn-datetime";
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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("email");
  const tc = useTranslations("common");
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
        title: t("share.fetchFailed"),
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
        title: t("share.createSuccess"),
      });
    } catch (error) {
      console.error("Failed to create share:", error);
      toast({
        title: t("share.createFailed"),
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
        title: t("share.deleteSuccess"),
      });
    } catch (error) {
      console.error("Failed to delete share:", error);
      toast({
        title: t("share.deleteFailed"),
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
        title: t("share.linkCopied"),
      });
    } else {
      toast({
        title: tc("copyFailed"),
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

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={t("share.title")}
      aria-label={t("share.title")}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );

  const shareBody = (
    <div className="space-y-6">
      {/* Create new share link */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("share.linkExpiry")}</Label>
        <div className="flex gap-2">
          <Select value={expiryTime} onValueChange={setExpiryTime}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={createShare}
            disabled={creating}
            className="min-w-[100px]"
          >
            {creating ? t("share.creatingLink") : t("share.createLink")}
          </Button>
        </div>
      </div>

      {/* Active share links */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("share.currentLinks")}</Label>
        <div className="max-h-[240px] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
              <span>{tc("loading")}</span>
            </div>
          ) : shares.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
              <div className="text-3xl">📭</div>
              <div>
                <div className="font-medium mb-0.5">{t("share.noLinks")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("share.noLinksHint")}
                </div>
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
                          isExpired ? "text-destructive/60" : "text-primary"
                        )}
                      />
                      <Input
                        readOnly
                        value={getShareUrl(share.token)}
                        onClick={(e) => {
                          if (!isExpired) {
                            e.currentTarget.select();
                          }
                        }}
                        className={cn(
                          "flex-1 text-xs font-mono h-9 cursor-pointer",
                          isExpired
                            ? "bg-destructive/5 border-destructive/30 text-destructive/70 cursor-not-allowed"
                            : "bg-background border-border"
                        )}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        title={tc("copy")}
                        aria-label={tc("copy")}
                        onClick={() => handleCopy(share.token)}
                        disabled={isExpired}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 hover:bg-destructive/10"
                        title={tc("delete")}
                        aria-label={tc("delete")}
                        onClick={() => setDeleteTarget(share)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <div className="flex items-center justify-between">
                        <span>
                          {tc("createdAt", {
                            time: formatZhCnDateTime(share.createdAt, {
                              includeSeconds: true,
                            }),
                          })}
                        </span>
                        {isExpired && (
                          <span className="text-destructive font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                            {tc("expired")}
                          </span>
                        )}
                      </div>
                      <div>
                        {tc("expiresAtTime", {
                          time: share.expiresAt
                            ? formatZhCnDateTime(share.expiresAt, {
                                includeSeconds: true,
                              })
                            : tc("neverExpires"),
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
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
              <DialogTitle>{t("share.title")}</DialogTitle>
              <DialogDescription>{t("share.description")}</DialogDescription>
            </DialogHeader>
            {shareBody}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{t("share.title")}</DrawerTitle>
              <DrawerDescription>{t("share.description")}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">{shareBody}</div>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("share.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteShare(deleteTarget)}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
