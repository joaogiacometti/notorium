import { Redis } from "@upstash/redis";
import { createClient as createRedisClient, type RedisClientType } from "redis";
import { appEnv } from "@/env";

const upstashRedis =
  appEnv.RATE_LIMIT_BACKEND === "upstash"
    ? new Redis({
        url: appEnv.UPSTASH_REDIS_REST_URL,
        token: appEnv.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

let redisClient: RedisClientType | null = null;
let redisClientConnection: Promise<RedisClientType> | null = null;

function getRedisClient() {
  redisClient ??= createRedisClient({
    url: appEnv.REDIS_URL,
  });

  redisClientConnection ??= redisClient.connect();

  return { client: redisClient, connection: redisClientConnection };
}

function normalizeRateLimitKeyPart(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9:._-]/g, "");
}

export function getUtcDayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function getUtcDayResetAt(now: Date) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}

async function incrementDailyLimitWithRedis(key: string, resetAt: Date) {
  const { client, connection } = getRedisClient();
  await connection;

  const count = await client.incr(key);

  if (count === 1) {
    await client.expireAt(key, Math.floor(resetAt.getTime() / 1000));
  }

  return count;
}

async function incrementDailyLimitWithUpstash(key: string, resetAt: Date) {
  if (!upstashRedis) {
    throw new Error("Upstash Redis is not configured");
  }

  const count = await upstashRedis.incr(key);

  if (Number(count) === 1) {
    await upstashRedis.expireat(key, Math.floor(resetAt.getTime() / 1000));
  }

  return Number(count);
}

interface ConsumeUserDailyRateLimitOptions {
  prefix: string;
  userId: string;
  limit: number;
  errorCode: string;
  now?: Date;
}

export async function consumeUserDailyRateLimit({
  prefix,
  userId,
  limit,
  errorCode,
  now = new Date(),
}: ConsumeUserDailyRateLimitOptions): Promise<
  | { limited: false; remaining: number; resetAt: string }
  | { limited: true; errorCode: string; remaining: 0; resetAt: string }
> {
  const normalizedUserId = normalizeRateLimitKeyPart(userId);
  const dayKey = getUtcDayKey(now);
  const resetAt = getUtcDayResetAt(now);
  const key = `${prefix}:${dayKey}:${normalizedUserId}`;
  const count =
    appEnv.RATE_LIMIT_BACKEND === "redis"
      ? await incrementDailyLimitWithRedis(key, resetAt)
      : await incrementDailyLimitWithUpstash(key, resetAt);

  if (count > limit) {
    return {
      limited: true,
      errorCode,
      remaining: 0,
      resetAt: resetAt.toISOString(),
    };
  }

  return {
    limited: false,
    remaining: Math.max(0, limit - count),
    resetAt: resetAt.toISOString(),
  };
}

interface TryAcquireUserExpiringLockOptions {
  prefix: string;
  userId: string;
  ttlSeconds: number;
}

async function tryAcquireExpiringLockWithRedis(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  const { client, connection } = getRedisClient();
  await connection;
  const result = await client.set(key, "1", {
    NX: true,
    EX: ttlSeconds,
  });
  return result === "OK";
}

async function tryAcquireExpiringLockWithUpstash(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  if (!upstashRedis) {
    throw new Error("Upstash Redis is not configured");
  }

  const result = await upstashRedis.set(key, "1", {
    nx: true,
    ex: ttlSeconds,
  });

  return result === "OK";
}

export async function tryAcquireUserExpiringLock({
  prefix,
  userId,
  ttlSeconds,
}: TryAcquireUserExpiringLockOptions): Promise<boolean> {
  const normalizedUserId = normalizeRateLimitKeyPart(userId);
  const key = `${prefix}:${normalizedUserId}`;

  return appEnv.RATE_LIMIT_BACKEND === "redis"
    ? tryAcquireExpiringLockWithRedis(key, ttlSeconds)
    : tryAcquireExpiringLockWithUpstash(key, ttlSeconds);
}
