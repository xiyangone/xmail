import { SignButton } from "@/components/auth/sign-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Logo } from "@/components/ui/logo"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-16 bg-background/80 backdrop-blur-sm border-b border-gray-200 dark:border-purple-800/50">
      <div className="container mx-auto h-full px-4">
        <div className="h-full flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <SignButton />
          </div>
        </div>
      </div>
    </header>
  )
}