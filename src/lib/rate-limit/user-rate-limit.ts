import { Redis } from "@upstash/redis";
import { createClient as createRedisClient, type RedisClientType } from "redis";
import { getServerEnv } from "@/env";

type UpstashRedisCache = {
  backend: "upstash" | "redis";
  client: Redis | null;
};

let upstashRedisCache: UpstashRedisCache | null = null;

let redisClient: RedisClientType | null = null;
let redisClientConnection: Promise<RedisClientType> | null = null;

function getUpstashRedis() {
  const appEnv = getServerEnv();
  if (
    upstashRedisCache &&
    upstashRedisCache.backend === appEnv.RATE_LIMIT_BACKEND
  ) {
    return upstashRedisCache.client;
  }

  if (appEnv.RATE_LIMIT_BACKEND !== "upstash") {
    upstashRedisCache = {
      backend: appEnv.RATE_LIMIT_BACKEND,
      client: null,
    };
    return null;
  }

  const client = new Redis({
    url: appEnv.UPSTASH_REDIS_REST_URL,
    token: appEnv.UPSTASH_REDIS_REST_TOKEN,
  });
  upstashRedisCache = {
    backend: appEnv.RATE_LIMIT_BACKEND,
    client,
  };
  return client;
}

function getRedisClient() {
  const appEnv = getServerEnv();
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
  const redis = getUpstashRedis();
  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  const count = await redis.incr(key);

  if (Number(count) === 1) {
    await redis.expireat(key, Math.floor(resetAt.getTime() / 1000));
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
  const appEnv = getServerEnv();
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
  const redis = getUpstashRedis();
  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  const result = await redis.set(key, "1", {
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
  const appEnv = getServerEnv();

  return appEnv.RATE_LIMIT_BACKEND === "redis"
    ? tryAcquireExpiringLockWithRedis(key, ttlSeconds)
    : tryAcquireExpiringLockWithUpstash(key, ttlSeconds);
}
