import { Logo } from "./logo";
import Link from "next/link";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showCTA?: boolean;
}

export function BrandHeader({
  title = "XiYang Mail",
  subtitle = "临时邮箱服务",
  showCTA = true,
}: BrandHeaderProps) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {showCTA && (
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            创建我的临时邮箱
          </Link>
        </div>
      )}
    </div>
  );
}

