"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Copy, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

interface CardKey {
  id: string;
  code: string;
  emailAddress: string;
  isUsed: boolean;
  usedBy?: {
    id: string;
    name: string;
    username: string;
  };
  usedAt?: string;
  createdAt: string;
  expiresAt: string;
}

export function CardKeyPanel() {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("cardKey");
  const tc = useTranslations("common");

  const fetchCardKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/card-keys");
      if (!response.ok) {
        throw new Error(t("fetchFailed"));
      }
      const data = (await response.json()) as { cardKeys: CardKey[] };
      setCardKeys(data.cardKeys);
    } catch (error) {
      toast({
        title: tc("error"),
        description:
          error instanceof Error ? error.message : t("fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t, tc]);

  useEffect(() => {
    fetchCardKeys();
  }, [fetchCardKeys]);

  const generateCardKeys = async () => {
    const addresses = emailAddresses
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    if (addresses.length === 0) {
      toast({
        title: tc("error"),
        description: t("enterAtLeastOne"),
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/admin/card-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAddresses: addresses,
          expiryDays: parseInt(expiryDays),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      const data = (await response.json()) as {
        message: string;
        cardKeys: { code: string; emailAddress: string }[];
      };

      toast({
        title: tc("success"),
        description: data.message,
      });

      downloadCardKeys(data.cardKeys);
      setDialogOpen(false);
      setEmailAddresses("");
      fetchCardKeys();
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("generateFailed"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadCardKeys = (keys: { code: string; emailAddress: string }[]) => {
    const content = keys
      .map((key) => `${key.code} - ${key.emailAddress}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `card-keys-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: tc("copied"),
      description: t("copiedToClipboard"),
    });
  };

  const deleteCardKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/card-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      toast({
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      // 强制刷新列表,清除缓存
      await fetchCardKeys();
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("deleteFailed"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("generate")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("generateTitle")}</DialogTitle>
              <DialogDescription>
                {t("generateDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="emails">{t("emailAddresses")}</Label>
                <Textarea
                  id="emails"
                  placeholder="user1@example.com&#10;user2@example.com"
                  value={emailAddresses}
                  onChange={(e) => setEmailAddresses(e.target.value)}
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="expiry">{t("expiryDays")}</Label>
                <Input
                  id="expiry"
                  type="number"
                  min="1"
                  max="365"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                />
              </div>
              <Button
                onClick={generateCardKeys}
                disabled={generating}
                className="w-full"
              >
                {generating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("generate")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cardKeys.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{t("noCardKeys")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("noCardKeysHint")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cardKeys.map((cardKey) => (
            <div
              key={cardKey.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                    {cardKey.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(cardKey.code)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {cardKey.emailAddress}
                </p>
                {cardKey.isUsed && cardKey.usedBy && (
                  <p className="text-xs text-muted-foreground">
                    {t("usedBy", { name: cardKey.usedBy.name || cardKey.usedBy.username })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={cardKey.isUsed ? "secondary" : "default"}
                  className="text-xs"
                >
                  {cardKey.isUsed ? t("used") : t("unused")}
                </Badge>
                {!cardKey.isUsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => deleteCardKey(cardKey.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
