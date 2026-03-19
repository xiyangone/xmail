import { SignButton } from "@/components/auth/sign-button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/ui/logo";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-[100] px-4 pt-1.5 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="surface-header-shell px-4 sm:px-5 lg:px-6">
          <div className="relative flex h-14 items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <SignButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
