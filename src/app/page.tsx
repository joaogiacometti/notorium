import {
  BookOpenText,
  Check,
  ClipboardList,
  Crown,
  FileText,
  FolderOpen,
  Minus,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
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
import { getOptionalSession } from "@/lib/auth";
import { FREE_LIMITS, PRO_LIMITS } from "@/lib/plan-limits";

const PLAN_ROWS: Array<{
  feature: string;
  free: string | boolean;
  pro: string | boolean;
}> = [
  {
    feature: "Subjects",
    free: String(FREE_LIMITS.maxSubjects),
    pro: String(PRO_LIMITS.maxSubjects),
  },
  {
    feature: "Notes per subject",
    free: String(FREE_LIMITS.maxNotesPerSubject),
    pro: String(PRO_LIMITS.maxNotesPerSubject),
  },
  {
    feature: "Assessments per subject",
    free: String(FREE_LIMITS.maxAssessmentsPerSubject),
    pro: String(PRO_LIMITS.maxAssessmentsPerSubject),
  },
  {
    feature: "Image attachments",
    free: FREE_LIMITS.imagesAllowed,
    pro: `${PRO_LIMITS.maxImageStorageMb} MB`,
  },
  { feature: "Rich text editor", free: true, pro: true },
  { feature: "Attendance tracking", free: true, pro: true },
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
    title: "Subjects",
    description:
      "Organize your courses and modules in one place with descriptions and attendance tracking.",
  },
  {
    icon: FileText,
    title: "Notes",
    description:
      "Write and format notes with a rich text editor supporting headings, lists, code blocks, and more.",
  },
  {
    icon: ClipboardList,
    title: "Assessments",
    description:
      "Track exams, assignments, and quizzes with grades, dates, and weight breakdowns.",
  },
];

export default async function Home() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/subjects");
  }

  return (
    <main className="flex flex-col">
      <section className="flex flex-col items-center gap-6 px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5" />
          Free to use — no credit card required
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your studies, <span className="text-primary">organized</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          Notorium helps you manage subjects, notes, assessments, and attendance
          all in one place. Stay on top of your academic life.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button size="lg" asChild>
            <Link href="/signup">
              <UserPlus className="size-4" />
              Get Started
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to stay on track
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border/50">
                <CardHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Simple plans for every student
          </h2>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60%]" />
                    <TableHead className="text-center">
                      <Badge variant="secondary">Free</Badge>
                    </TableHead>
                    <TableHead className="text-center">
                      <Badge className="gap-1">
                        <Crown className="size-3" />
                        Pro
                      </Badge>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PLAN_ROWS.map((row) => (
                    <TableRow
                      key={row.feature}
                      className="hover:bg-transparent"
                    >
                      <TableCell className="text-muted-foreground">
                        {row.feature}
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
                  <Link href="/signup">Start for free</Link>
                </Button>
                <Button
                  className="w-full sm:w-auto sm:px-12"
                  variant="outline"
                  disabled
                >
                  <Crown className="size-3.5" />
                  Become Pro
                  <Badge variant="secondary" className="text-[10px]">
                    Coming soon
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
