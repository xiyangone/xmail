import { SignButton } from "@/components/auth/sign-button"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Logo } from "@/components/ui/logo"

export function Header() {
  return (
    <header className="surface-toolbar fixed left-0 right-0 top-0 z-[100] h-16 border-b border-border/60">
      <div className="container mx-auto h-full px-4">
        <div className="h-full flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
            <SignButton />
          </div>
        </div>
      </div>
    </header>
  )
}
