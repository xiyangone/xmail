"use client";

import { Button } from "@/components/ui/button";
import { Gem, Sword, User2, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ROLES, Role } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

const roleIcons = {
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: User2,
  [ROLES.TEMP_USER]: Clock,
} as const;

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>;

export function PromotePanel() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetRole, setTargetRole] = useState<RoleWithoutEmperor>(
    ROLES.KNIGHT
  );
  const { toast } = useToast();
  const t = useTranslations("profile");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");

  const roleNames = {
    [ROLES.DUKE]: tr("duke"),
    [ROLES.KNIGHT]: tr("knight"),
    [ROLES.CIVILIAN]: tr("civilian"),
    [ROLES.TEMP_USER]: tr("tempUser"),
  } as const;

  const handleAction = async () => {
    if (!searchText) return;

    setLoading(true);
    try {
      const res = await fetch("/api/roles/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchText }),
      });
      const data = (await res.json()) as {
        user?: {
          id: string;
          name?: string;
          username?: string;
          email: string;
          role?: string;
        };
        error?: string;
      };

      if (!res.ok) throw new Error(data.error || t("unknownError"));

      if (!data.user) {
        toast({
          title: t("userNotFound"),
          description: t("userNotFoundDesc"),
          variant: "destructive",
        });
        return;
      }

      if (data.user.role === targetRole) {
        toast({
          title: t("userAlreadyRole", { role: roleNames[targetRole] }),
          description: t("noNeedToRepeat"),
        });
        return;
      }

      const promoteRes = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          roleName: targetRole,
        }),
      });

      if (!promoteRes.ok) {
        const error = (await promoteRes.json()) as { error: string };
        throw new Error(error.error || t("setFailed"));
      }

      toast({
        title: t("setSuccess"),
        description: t("setSuccessDesc", {
          user: data.user.username || data.user.email,
          role: roleNames[targetRole],
        }),
      });
      setSearchText("");
    } catch (error) {
      toast({
        title: t("setFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const Icon = roleIcons[targetRole];

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("roleManagement")}</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t("searchUserPlaceholder")}
            />
          </div>
          <Select
            value={targetRole}
            onValueChange={(value) =>
              setTargetRole(value as RoleWithoutEmperor)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLES.DUKE}>
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  {tr("duke")}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.KNIGHT}>
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  {tr("knight")}
                </div>
              </SelectItem>
              <SelectItem value={ROLES.CIVILIAN}>
                <div className="flex items-center gap-2">
                  <User2 className="w-4 h-4" />
                  {tr("civilian")}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAction}
          disabled={loading || !searchText.trim()}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("setRole", { role: roleNames[targetRole] })
          )}
        </Button>
      </div>
    </div>
  );
}
