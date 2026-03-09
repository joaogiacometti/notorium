import {
  BookOpenText,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  FolderOpen,
  Layers,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { getOptionalSession } from "@/lib/auth/auth";
import { cn } from "@/lib/utils";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10Z" />
  </svg>
);

type LandingTranslationKey =
  | "subjects_title"
  | "subjects_description"
  | "notes_title"
  | "notes_description"
  | "assessments_title"
  | "assessments_description"
  | "calendar_title"
  | "calendar_description"
  | "flashcards_title"
  | "flashcards_description";

const FEATURES: {
  icon: React.ElementType;
  titleKey: LandingTranslationKey;
  descriptionKey: LandingTranslationKey;
}[] = [
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
  const locale = await getLocale();
  const t = await getTranslations("Index");
  const tLanding = await getTranslations("Landing");

  if (session) {
    redirect(`/${locale}/subjects`);
  }

  return (
    <main className="flex flex-col">
      <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">
        <div className="flex max-w-88 items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-4 py-2 text-center text-sm leading-snug text-foreground/90 sm:max-w-none hover:bg-muted/90 transition-colors backdrop-blur-sm shadow-sm cursor-default">
          <Sparkles className="size-4 shrink-0 text-primary animate-pulse" />
          <span className="font-medium">{t("badge")}</span>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl text-balance">
          {t("title_start")}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
            {t("title_highlight")}
          </span>
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

      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            {tLanding("features_heading")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Card
                key={feature.titleKey}
                className={cn(
                  "group overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30",
                  i === 0 && "sm:col-span-2 lg:col-span-2",
                  i === 3 && "sm:col-span-2 lg:col-span-2",
                  i === 4 && "sm:col-span-2 lg:col-span-3",
                )}
              >
                <CardHeader className="h-full">
                  <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    {tLanding(feature.titleKey)}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {tLanding(feature.descriptionKey)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-12 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              {tLanding("all_inclusive_heading")}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
              {tLanding("all_inclusive_description")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              "limit_subjects",
              "limit_notes",
              "limit_flashcards",
              "limit_assessments",
            ].map((limitKey) => (
              <div
                key={limitKey}
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/50 bg-muted/20 p-6 transition-all duration-300 hover:bg-muted/40 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-7" />
                </div>
                <span className="text-sm font-medium text-foreground text-center">
                  {tLanding(limitKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-border/50 bg-muted/30 p-8 sm:p-12 transition-all hover:bg-muted/50 hover:border-primary/20 backdrop-blur-sm">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
              <GithubIcon className="size-8" />
            </div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {tLanding(
                "opensource_notice_title" as Parameters<typeof tLanding>[0],
              )}
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              {tLanding(
                "opensource_notice_description" as Parameters<
                  typeof tLanding
                >[0],
              )}
            </p>
            <Button size="lg" className="rounded-full px-8" asChild>
              <a
                href="https://github.com/joaogiacometti/notorium"
                target="_blank"
                rel="noreferrer"
              >
                {tLanding(
                  "opensource_repo_link" as Parameters<typeof tLanding>[0],
                )}
              </a>
            </Button>
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
