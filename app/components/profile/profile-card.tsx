"use client"

import { User } from "next-auth"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Github, Settings, Crown, Sword, User2, Gem, Mail, CreditCard, Zap, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { WebhookConfig } from "./webhook-config"
import { useRolePermission } from "@/hooks/use-role-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { CollapsibleSection } from "./collapsible-section"
import { WebsiteConfigContent } from "./website-config-content"
import { EmailServiceConfigContent } from "./email-service-config-content"
import { ApiKeySection } from "./api-key-section"

interface ProfileCardProps {
  user: User
}

const roleConfigs = {
  emperor: { name: '皇帝', icon: Crown },
  duke: { name: '公爵', icon: Gem },
  knight: { name: '骑士', icon: Sword },
  civilian: { name: '平民', icon: User2 },
} as const

export function ProfileCard({ user }: ProfileCardProps) {
  const router = useRouter()
  const { checkPermission } = useRolePermission()
  const canManageWebhook = checkPermission(PERMISSIONS.MANAGE_WEBHOOK)
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER)
  const canManageConfig = checkPermission(PERMISSIONS.MANAGE_CONFIG)
  const canManageCardKeys = checkPermission(PERMISSIONS.MANAGE_CARD_KEYS)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-background rounded-lg border-2 border-primary/20 p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {user.image && (
              <>
                <Image
                  src={user.image}
                  alt={user.name || "用户头像"}
                  width={80}
                  height={80}
                  className="rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/0 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{user.name}</h2>
              {
                user.email && (
                  // 先简单实现，后续再完善
                  <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    <Github className="w-3 h-3" />
                    已关联
                  </div>
                )
              }
            </div>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {
                user.email ? user.email : `用户名: ${user.username}`
              }
            </p>
            {user.roles && (
              <div className="flex gap-2 mt-2">
                {user.roles.map(({ name }) => {
                  const roleConfig = roleConfigs[name as keyof typeof roleConfigs]
                  const Icon = roleConfig.icon
                  return (
                    <div 
                      key={name}
                      className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
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
        <CollapsibleSection title="Webhook 配置" icon={Settings} storageKey="profile-webhook-open">
          <WebhookConfig />
        </CollapsibleSection>
      )}

      {canManageConfig && (
        <CollapsibleSection title="网站设置" icon={Settings} storageKey="profile-website-open">
          <WebsiteConfigContent />
        </CollapsibleSection>
      )}

      {canManageConfig && (
        <CollapsibleSection title="Resend 发件服务配置" icon={Zap} storageKey="profile-email-service-open">
          <EmailServiceConfigContent />
        </CollapsibleSection>
      )}

      {canManageWebhook && <ApiKeySection />}

      {canManageCardKeys && (
        <div className="bg-background rounded-lg border-2 border-primary/20 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <CreditCard className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">卡密管理</h3>
                <p className="text-sm text-muted-foreground">
                  管理卡密系统，生成和管理临时账号卡密
                </p>
              </div>
            </div>
            <Button 
              onClick={() => router.push("/admin/card-keys")}
              className="gap-2 flex-shrink-0 bg-orange-500 hover:bg-orange-600 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              <CreditCard className="w-4 h-4" />
              管理卡密
            </Button>
          </div>
        </div>
      )}

      {canPromote && (
        <div className="bg-background rounded-lg border-2 border-primary/20 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Users className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">用户管理</h3>
                <p className="text-sm text-muted-foreground">
                  管理系统用户，查看和修改用户角色权限
                </p>
              </div>
            </div>
            <Button 
              onClick={() => router.push("/admin/users")}
              className="gap-2 flex-shrink-0 bg-orange-500 hover:bg-orange-600 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              <Users className="w-4 h-4" />
              管理用户
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 px-1">
        <Button 
          onClick={() => router.push("/moe")}
          className="gap-2 flex-1"
        >
          <Mail className="w-4 h-4" />
          返回邮箱
        </Button>
        <Button 
          variant="outline" 
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex-1"
        >
          退出登录
        </Button>
      </div>
    </div>
  )
} 