import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");

  return (
    <AppShell>
      <section role="status" aria-label={t("loading")} className="space-y-5 py-6">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl md:col-span-2" />
        </div>
      </section>
    </AppShell>
  );
}
