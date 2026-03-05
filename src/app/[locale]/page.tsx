import {
  BookOpenText,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Layers,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { getOptionalSession } from "@/lib/auth";

const FEATURES = [
  {
    icon: FolderOpen,
    titleKey: "subjects_title",
    descriptionKey: "subjects_description",
  },
  {
    icon: FileText,
    titleKey: "notes_title",
    descriptionKey: "notes_description",
  },
  {
    icon: ClipboardList,
    titleKey: "assessments_title",
    descriptionKey: "assessments_description",
  },
  {
    icon: CalendarDays,
    titleKey: "calendar_title",
    descriptionKey: "calendar_description",
  },
  {
    icon: Layers,
    titleKey: "flashcards_title",
    descriptionKey: "flashcards_description",
  },
];

export default async function Home() {
  const session = await getOptionalSession();
  const t = await getTranslations("Index");
  const tLanding = await getTranslations("Landing");

  if (session) {
    redirect("/subjects");
  }

  return (
    <main className="flex flex-col">
      <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">
        <div className="flex max-w-88 items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-4 py-2 text-center text-sm leading-snug text-foreground/90 sm:max-w-none">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span>{t("badge")}</span>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t("title_start")}
          <span className="text-primary">{t("title_highlight")}</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          {t("description")}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button size="lg" asChild>
            <Link href="/signup">
              <UserPlus className="size-4" />
              {t("get_started")}
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t("sign_in")}</Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {tLanding("features_heading")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.titleKey} className="border-border/50">
                <CardHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle>{tLanding(feature.titleKey)}</CardTitle>
                  <CardDescription>
                    {tLanding(feature.descriptionKey)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-muted-foreground">
          <BookOpenText className="size-4" />
          Notorium
        </div>
      </footer>
    </main>
  );
}
