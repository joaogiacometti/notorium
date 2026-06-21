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
    <div className="space-y-1">
      <h1
        data-testid="home-greeting"
        className="text-2xl font-semibold tracking-tight text-foreground"
      >
        Welcome back, {name}
      </h1>
      <p className="text-sm text-muted-foreground">
        Here's what's happening across your subjects.
      </p>
    </div>
  );
}
