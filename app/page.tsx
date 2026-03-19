import { AppShell } from "@/components/layout/app-shell"
import { auth } from "@/lib/auth"
import { Shield, Mail, Clock, Share2 } from "lucide-react"
import { ActionButton } from "@/components/home/action-button"
import { FeatureCard } from "@/components/home/feature-card"
import { getTranslations } from "next-intl/server"


export default async function Home() {
  const session = await auth()
  const t = await getTranslations("home")

  return (
    <AppShell fullHeight>
      <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto w-full max-w-4xl space-y-12 py-8 animate-fade-in-up">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-wider sm:text-5xl md:text-6xl">
              <span className="animate-gradient bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent bg-gradient-size">
                XiYang Mail
              </span>
            </h1>
            <p className="text-lg tracking-wide text-muted-foreground sm:text-xl md:text-2xl">
              {t("subtitle")}
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-0">
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title={t("features.privacy.title")}
              description={t("features.privacy.description")}
            />
            <FeatureCard
              icon={<Mail className="w-5 h-5" />}
              title={t("features.instant.title")}
              description={t("features.instant.description")}
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title={t("features.autoExpiry.title")}
              description={t("features.autoExpiry.description")}
            />
            <FeatureCard
              icon={<Share2 className="w-5 h-5" />}
              title={t("features.share.title")}
              description={t("features.share.description")}
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:px-0">
            <ActionButton isLoggedIn={!!session} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
