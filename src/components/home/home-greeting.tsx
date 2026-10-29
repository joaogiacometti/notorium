import { PageHeader } from "@/components/shared/page-header";

interface HomeGreetingProps {
  name: string;
}

/**
 * Personalised dashboard heading. Uses a static, time-independent greeting so
 * the server-rendered text is final — no client clock, no hydration mismatch,
 * and no visible transition after hydration.
 *
 * @example
 * <HomeGreeting name="Ana" />
 */
export function HomeGreeting({ name }: Readonly<HomeGreetingProps>) {
  return (
    <PageHeader title={`Welcome back, ${name}`} titleTestId="home-greeting" />
  );
}
