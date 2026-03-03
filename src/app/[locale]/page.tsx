import {
  BookOpenText,
  CalendarDays,
  Check,
  ClipboardList,
  Crown,
  FileText,
  FolderOpen,
  Minus,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { getOptionalSession } from "@/lib/auth";
import { FREE_LIMITS, PRO_LIMITS } from "@/lib/plan-limits";

const PLAN_ROWS: Array<{
  featureKey: string;
  free: string | boolean;
  pro: string | boolean;
}> = [
  {
    featureKey: "subjects",
    free: String(FREE_LIMITS.maxSubjects),
    pro: String(PRO_LIMITS.maxSubjects),
  },
  {
    featureKey: "notes_per_subject",
    free: String(FREE_LIMITS.maxNotesPerSubject),
    pro: String(PRO_LIMITS.maxNotesPerSubject),
  },
  {
    featureKey: "assessments_per_subject",
    free: String(FREE_LIMITS.maxAssessmentsPerSubject),
    pro: String(PRO_LIMITS.maxAssessmentsPerSubject),
  },
  {
    featureKey: "image_attachments",
    free: FREE_LIMITS.imagesAllowed,
    pro: `${PRO_LIMITS.maxImageStorageMb} MB`,
  },
  { featureKey: "rich_text_editor", free: true, pro: true },
  { featureKey: "attendance_tracking", free: true, pro: true },
];

function PlanCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="size-4 text-primary" />;
  }
  if (value === false) {
    return <Minus className="size-4 text-muted-foreground/40" />;
  }
  return value;
}

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
];

import { getTranslations } from "next-intl/server";

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

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {tLanding("plans_heading")}
          </h2>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60%]" />
                    <TableHead className="text-center">
                      <Badge variant="secondary">{tLanding("free")}</Badge>
                    </TableHead>
                    <TableHead className="text-center">
                      <Badge className="gap-1">
                        <Crown className="size-3" />
                        {tLanding("pro")}
                      </Badge>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PLAN_ROWS.map((row) => (
                    <TableRow
                      key={row.featureKey}
                      className="hover:bg-transparent"
                    >
                      <TableCell className="text-muted-foreground">
                        {tLanding(`plan_feature_${row.featureKey}`)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        <span className="flex justify-center">
                          <PlanCell value={row.free} />
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        <span className="flex justify-center">
                          <PlanCell value={row.pro} />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col items-center gap-3 pt-6 sm:flex-row sm:justify-center">
                <Button className="w-full sm:w-auto sm:px-12" asChild>
                  <Link href="/signup">{tLanding("start_for_free")}</Link>
                </Button>
                <Button
                  className="w-full sm:w-auto sm:px-12"
                  variant="outline"
                  disabled
                >
                  <Crown className="size-3.5" />
                  {tLanding("become_pro")}
                  <Badge variant="secondary" className="text-[10px]">
                    {tLanding("coming_soon")}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
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
