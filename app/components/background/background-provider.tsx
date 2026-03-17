"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface BackgroundConfig {
  bgLight: string
  bgDark: string
  bgSakura: string
}

interface UserBackgroundConfig extends BackgroundConfig {
  bgEnabled: boolean
}

export function BackgroundProvider() {
  const { resolvedTheme } = useTheme()
  const { data: session } = useSession()
  const [globalBg, setGlobalBg] = useState<BackgroundConfig | null>(null)
  const [userBg, setUserBg] = useState<UserBackgroundConfig | null>(null)

  // 加载全局背景配置
  useEffect(() => {
    fetch("/api/config/background")
      .then((res) => res.ok ? res.json() as Promise<BackgroundConfig> : null)
      .then((data) => data && setGlobalBg(data))
      .catch(() => {})
  }, [])

  // 加载用户背景配置（登录后）
  useEffect(() => {
    if (!session?.user) return
    fetch("/api/user/settings")
      .then((res) => res.ok ? res.json() as Promise<UserBackgroundConfig> : null)
      .then((data) => data && setUserBg(data))
      .catch(() => {})
  }, [session?.user])

  // 根据主题获取背景 URL
  const getBgUrl = (): string => {
    // 用户关闭了背景
    if (userBg && !userBg.bgEnabled) return ""

    const themeKey = resolvedTheme === "dark" ? "bgDark"
      : resolvedTheme === "sakura" ? "bgSakura"
      : "bgLight"

    // 优先用户自定义，其次全局
    const userUrl = userBg?.[themeKey]
    if (userUrl) return userUrl

    const globalUrl = globalBg?.[themeKey]
    if (globalUrl) return globalUrl

    return ""
  }

  const bgUrl = getBgUrl()

  if (!bgUrl) return null

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "hsl(var(--background) / var(--background-overlay-opacity))",
          backdropFilter: "blur(var(--background-overlay-blur))",
        }}
      />
    </div>
  )
}
