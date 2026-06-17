"use client";

import { useEffect, useState } from "react";
import { greetingForHour } from "@/components/home/greeting";

interface HomeGreetingProps {
  name: string;
}

/**
 * Personalised dashboard heading. The time-of-day greeting is resolved from the
 * browser clock after mount (not during SSR) so the user's local time decides
 * it without risking a hydration mismatch; until then it shows a neutral label.
 */
export function HomeGreeting({ name }: Readonly<HomeGreetingProps>) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1
      data-testid="home-greeting"
      className="text-2xl font-semibold text-foreground"
    >
      {greeting ? `${greeting}, ${name}` : `Welcome back, ${name}`}
    </h1>
  );
}
