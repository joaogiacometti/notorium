interface FakeDailyLimitCall {
  prefix: string;
  userId: string;
  limit: number;
}

/**
 * In-memory stand-in for `consumeUserDailyRateLimit`: counts calls per
 * prefix and user, and reports `limited` once a count passes its limit.
 * `failWith` makes the next call throw, like an unreachable Redis.
 *
 * @example
 * const limiter = new FakeDailyRateLimiter();
 * vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
 *   consumeUserDailyRateLimit: (options) => limiter.consume(options),
 * }));
 */
export class FakeDailyRateLimiter {
  readonly calls: FakeDailyLimitCall[] = [];
  private readonly counts = new Map<string, number>();
  private nextError: Error | null = null;

  failWith(error: Error): void {
    this.nextError = error;
  }

  async consume(options: FakeDailyLimitCall & { errorCode: string }) {
    this.calls.push({
      prefix: options.prefix,
      userId: options.userId,
      limit: options.limit,
    });
    this.throwPendingError();

    const key = `${options.prefix}:${options.userId}`;
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    const resetAt = "2026-01-02T00:00:00.000Z";

    return count > options.limit
      ? {
          limited: true as const,
          errorCode: options.errorCode,
          remaining: 0 as const,
          resetAt,
        }
      : { limited: false as const, remaining: options.limit - count, resetAt };
  }

  private throwPendingError(): void {
    const error = this.nextError;
    this.nextError = null;
    if (error) throw error;
  }
}
