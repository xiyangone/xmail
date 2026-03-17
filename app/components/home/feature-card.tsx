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
    <div className="group p-6 rounded-lg border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur hover:shadow-xl hover:scale-105 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 text-primary p-3 group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
});
