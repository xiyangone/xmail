import { memo } from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard = memo(function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="home-feature-surface group surface-panel rounded-[1.75rem] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary-light)/0.26),hsl(var(--primary)/0.08))] p-3 text-primary shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
});
