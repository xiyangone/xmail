import { Header } from "@/components/layout/header"
import { auth } from "@/lib/auth"
import { Shield, Mail, Clock } from "lucide-react"
import { ActionButton } from "@/components/home/action-button"
import { FeatureCard } from "@/components/home/feature-card"
import { getTranslations } from "next-intl/server"


export default async function Home() {
  const session = await auth()
  const t = await getTranslations("home")

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#2a2140] dark:to-[#3d2e5a] h-screen">
      <div className="container mx-auto h-full px-4 lg:px-8 max-w-[1600px]">
        <Header />
        <main className="h-full">
          <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 relative">
            <div className="absolute inset-0 -z-10 bg-grid-primary/5" />
            
            <div className="w-full max-w-3xl mx-auto space-y-12 py-8 animate-fade-in-up">
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF8A3D] via-[#FF5E62] to-[#a855f7] bg-gradient-size animate-gradient">
                    XiYang Mail
                  </span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 tracking-wide">
                  {t("subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
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
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0">
                <ActionButton isLoggedIn={!!session} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
