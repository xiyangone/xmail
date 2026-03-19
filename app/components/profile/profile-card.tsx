"use client"

import { User } from "next-auth"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Github, Settings, Crown, Sword, User2, Gem, Mail, Zap, Shield, ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRolePermission } from "@/hooks/use-role-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { CollapsibleSection } from "./collapsible-section"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { MAILBOX_ROUTE } from "@/lib/routes"

const WebhookConfig = dynamic(() => import("./webhook-config").then(mod => ({ default: mod.WebhookConfig })), {
  loading: () => <div className="text-sm text-muted-foreground">加载中...</div>
})
const WebsiteConfigContent = dynamic(() => import("./website-config-content").then(mod => ({ default: mod.WebsiteConfigContent })), {
  loading: () => <div className="text-sm text-muted-foreground">加载中...</div>
})
const EmailServiceConfigContent = dynamic(() => import("./email-service-config-content").then(mod => ({ default: mod.EmailServiceConfigContent })), {
  loading: () => <div className="text-sm text-muted-foreground">加载中...</div>
})
const ApiKeySection = dynamic(() => import("./api-key-section").then(mod => ({ default: mod.ApiKeySection })), {
  loading: () => <div className="text-sm text-muted-foreground">加载中...</div>
})
const BackgroundSettingsContent = dynamic(() => import("@/components/background/background-settings").then(mod => ({ default: mod.BackgroundSettingsContent })), {
  loading: () => <div className="text-sm text-muted-foreground">加载中...</div>
})

interface ProfileCardProps {
  user: User
}

export function ProfileCard({ user }: ProfileCardProps) {
  const router = useRouter()
  const { checkPermission } = useRolePermission()
  const canManageWebhook = checkPermission(PERMISSIONS.MANAGE_WEBHOOK)
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER)
  const canManageConfig = checkPermission(PERMISSIONS.MANAGE_CONFIG)
  const canManageCardKeys = checkPermission(PERMISSIONS.MANAGE_CARD_KEYS)
  const t = useTranslations("profile")
  const tr = useTranslations("roles")
  const ta = useTranslations("auth")

  const roleConfigs = {
    emperor: { name: tr('emperor'), icon: Crown },
    duke: { name: tr('duke'), icon: Gem },
    knight: { name: tr('knight'), icon: Sword },
    civilian: { name: tr('civilian'), icon: User2 },
  } as const

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in-up pb-6">
      <div className="profile-hero-surface surface-panel-strong rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative group">
            {user.image && (
              <>
                <Image
                  src={user.image}
                  alt={user.name || ta("userAvatar")}
                  width={80}
                  height={80}
                  className="rounded-full ring-2 ring-primary/25 shadow-[0_18px_36px_hsl(var(--primary)/0.16)] transition-all duration-300 group-hover:scale-105 group-hover:ring-primary/45"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/0 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{user.name}</h2>
              {user.email && (
                <div className="profile-pill-surface flex flex-shrink-0 items-center gap-1 rounded-full border border-primary/18 px-2.5 py-1 text-xs text-primary backdrop-blur-xl">
                  <Github className="w-3 h-3" />
                  {t("githubLinked")}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {user.email ? user.email : t("usernameLabel", { name: user.username ?? "" })}
            </p>
            {user.roles && (
              <div className="mt-3 flex flex-wrap gap-2">
                {user.roles.map(({ name }) => {
                  const roleConfig = roleConfigs[name as keyof typeof roleConfigs]
                  const Icon = roleConfig.icon
                  return (
                    <div
                      key={name}
                      className="profile-pill-surface flex items-center gap-1 rounded-full border border-primary/15 px-3 py-1 text-xs text-primary backdrop-blur-xl"
                      title={roleConfig.name}
                    >
                      <Icon className="w-3 h-3" />
                      {roleConfig.name}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {canManageWebhook && (
        <CollapsibleSection title={t("webhookConfig")} icon={Settings} storageKey="profile-webhook-open">
          <WebhookConfig />
        </CollapsibleSection>
      )}

      {canManageConfig && (
        <CollapsibleSection title={t("websiteSettings")} icon={Settings} storageKey="profile-website-open">
          <WebsiteConfigContent />
        </CollapsibleSection>
      )}

      {canManageConfig && (
        <CollapsibleSection title={t("resendConfig")} icon={Zap} storageKey="profile-email-service-open">
          <EmailServiceConfigContent />
        </CollapsibleSection>
      )}

      {canManageWebhook && <ApiKeySection />}

      {canManageWebhook && (
        <CollapsibleSection title={t("backgroundSettings")} icon={ImageIcon} storageKey="profile-bg-open">
          <BackgroundSettingsContent />
        </CollapsibleSection>
      )}

      <div className="profile-action-surface surface-panel rounded-[1.75rem] p-1.5 sm:p-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => router.push(MAILBOX_ROUTE)}
            className="gap-2 flex-1 rounded-[1.15rem] shadow-[0_18px_40px_hsl(var(--primary)/0.22)]"
          >
            <Mail className="w-4 h-4" />
            {t("backToMailbox")}
          </Button>
          {(canManageCardKeys || canPromote) && (
            <Button
              onClick={() => router.push("/admin")}
              variant="glass"
              className="gap-2 flex-1 rounded-[1.15rem]"
            >
              <Shield className="w-4 h-4" />
              {t("adminDashboard")}
            </Button>
          )}
          <Button
            variant="glass"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 rounded-[1.15rem] border-primary/18 text-muted-foreground shadow-none hover:border-primary/28 hover:text-foreground"
          >
            {ta("logout")}
          </Button>
        </div>
      </div>
    </div>
  )
}
