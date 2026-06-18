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
    <h1
      data-testid="home-greeting"
      className="text-2xl font-semibold text-foreground"
    >
      Welcome back, {name}
    </h1>
  );
}
