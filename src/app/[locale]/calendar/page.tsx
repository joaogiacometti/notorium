import { redirect } from "next/navigation";

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CalendarPage({
  params,
}: Readonly<CalendarPageProps>) {
  const { locale } = await params;
  redirect(`/${locale}/planning?view=calendar`);
}
