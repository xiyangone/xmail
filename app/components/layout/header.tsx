import { SignButton } from "@/components/auth/sign-button"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Logo } from "@/components/ui/logo"

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-[100]">
      <div className="container mx-auto max-w-[1600px] px-4 pt-3 lg:px-8">
        <div className="surface-toolbar flex h-14 items-center justify-between rounded-2xl border border-white/15 px-4 shadow-xl shadow-black/5">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignButton />
          </div>
        </div>
      </div>
    </header>
  )
}
