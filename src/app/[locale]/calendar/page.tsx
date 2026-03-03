import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CalendarView } from "@/components/calendar-view";
import { requireSession } from "@/lib/auth";

export default async function CalendarPage() {
  await requireSession();
  const t = await getTranslations("CalendarPage");

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>

        <CalendarView />
      </div>
    </main>
  );
}
