import { redirect } from "next/navigation";

interface AssessmentsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AssessmentsPage({
  params,
}: Readonly<AssessmentsPageProps>) {
  const { locale } = await params;
  redirect(`/${locale}/planning?view=assessments`);
}
