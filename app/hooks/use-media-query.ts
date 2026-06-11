"use client"

import * as React from "react"

/**
 * SSR 安全的媒体查询 hook。
 * 首屏默认 false，挂载后用 matchMedia 同步真实结果，避免 hydration 不一致。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const onChange = () => setMatches(mediaQueryList.matches)

    onChange()
    mediaQueryList.addEventListener("change", onChange)
    return () => mediaQueryList.removeEventListener("change", onChange)
  }, [query])

  return matches
}
