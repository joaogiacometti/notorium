import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { createClient as createRedisClient, type RedisClientType } from "redis";
import { appEnv } from "@/env";

const authRateLimitMaxAttempts = appEnv.AUTH_RATE_LIMIT_MAX_ATTEMPTS;
const authRateLimitWindowSeconds = appEnv.AUTH_RATE_LIMIT_WINDOW_SECONDS;
const authRateLimitPrefix = appEnv.AUTH_RATE_LIMIT_PREFIX;

const authRateLimit = (() => {
  if (appEnv.RATE_LIMIT_BACKEND !== "upstash") {
    return null;
  }

  return new Ratelimit({
    redis: new Redis({
      url: appEnv.UPSTASH_REDIS_REST_URL,
      token: appEnv.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(
      appEnv.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
      `${appEnv.AUTH_RATE_LIMIT_WINDOW_SECONDS} s`,
    ),
    prefix: appEnv.AUTH_RATE_LIMIT_PREFIX,
  });
})();

let redisClient: RedisClientType | null = null;
let redisClientConnection: Promise<RedisClientType> | null = null;

function normalizeRateLimitKeyPart(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9:._-]/g, "");
}

function extractCandidateIp(headersList: Headers) {
  const forwardedForChain = headersList
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const trustedProxyCount = appEnv.TRUSTED_PROXY_COUNT;
  const forwardedForIndex = Math.max(
    0,
    (forwardedForChain?.length ?? 1) - trustedProxyCount - 1,
  );
  const forwardedFor = forwardedForChain?.[forwardedForIndex];

  const candidates = [
    forwardedFor,
    headersList.get("x-real-ip")?.trim(),
    headersList.get("cf-connecting-ip")?.trim(),
    headersList.get("x-vercel-forwarded-for")?.trim(),
  ];

  const trustedIp = candidates.find(
    (value) =>
      typeof value === "string" &&
      value.length > 0 &&
      value.length <= 64 &&
      /^[a-z0-9:._-]+$/i.test(value),
  );

  return trustedIp ?? "no-ip";
}

async function getAuthRateLimitKey(identifier?: string) {
  const headersList = await headers();
  const ip = extractCandidateIp(headersList);
  const normalizedIp = normalizeRateLimitKeyPart(ip);
  const normalizedIdentifier = normalizeRateLimitKeyPart(
    identifier?.trim() ?? "anonymous",
  );
  return `${normalizedIp}:${normalizedIdentifier || "anonymous"}`;
}

function getRedisClient() {
  redisClient ??= createRedisClient({
    url: appEnv.REDIS_URL,
  });

  redisClientConnection ??= redisClient.connect();

  return { client: redisClient, connection: redisClientConnection };
}

async function checkAuthRateLimitWithRedis(ip: string) {
  const now = Date.now();
  const windowMs = authRateLimitWindowSeconds * 1000;
  const windowStart = now - windowMs;
  const key = `${authRateLimitPrefix}:${ip}`;
  const member = `${now}-${crypto.randomUUID()}`;

  const script = `
local key = KEYS[1]
local windowStart = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local windowMs = tonumber(ARGV[4])
local member = ARGV[5]

redis.call("ZREMRANGEBYSCORE", key, "-inf", windowStart)
local count = redis.call("ZCARD", key)

if count >= limit then
  redis.call("PEXPIRE", key, windowMs)
  return 0
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, windowMs)
return 1
`;

  const { client, connection } = getRedisClient();
  await connection;

  const allowed = await client.eval(script, {
    keys: [key],
    arguments: [
      String(windowStart),
      String(now),
      String(authRateLimitMaxAttempts),
      String(windowMs),
      member,
    ],
  });

  if (Number(allowed) === 0) {
    return {
      limited: true as const,
      errorCode: "auth.rateLimited",
    };
  }

  return {
    limited: false as const,
  };
}

export async function checkAuthRateLimit(
  identifier?: string,
): Promise<{ limited: false } | { limited: true; errorCode: string }> {
  const key = await getAuthRateLimitKey(identifier);

  if (appEnv.RATE_LIMIT_BACKEND === "redis") {
    return checkAuthRateLimitWithRedis(key);
  }

  if (!authRateLimit) {
    return {
      limited: false,
    };
  }

  const { success } = await authRateLimit.limit(key);
  return success
    ? { limited: false }
    : {
        limited: true,
        errorCode: "auth.rateLimited",
      };
}
