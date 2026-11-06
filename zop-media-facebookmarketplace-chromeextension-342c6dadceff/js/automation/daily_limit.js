export const DAILY_LIMIT_DEFAULT = 25;
export const DAILY_LIMIT_OPTIONS = [5, 10, 15, 25];
export const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function formatRemainingTime(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatRemainingTimeFriendly(ms) {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

export async function getDailyPublishingState() {
  const data = await chrome.storage.local.get([
    "daily_publishing_limit",
    "daily_published_count",
    "daily_limit_reset_time",
  ]);

  let limit = Number(data.daily_publishing_limit) || DAILY_LIMIT_DEFAULT;
  let count = Number(data.daily_published_count) || 0;
  let resetTime = Number(data.daily_limit_reset_time) || 0;
  const now = Date.now();

  // If 24 hours have elapsed since the reset time was scheduled, reset the counter
  if (resetTime > 0 && now >= resetTime) {
    count = 0;
    resetTime = 0;
    await chrome.storage.local.set({
      daily_published_count: 0,
      daily_limit_reset_time: 0,
    });
  }

  const isLimitReached = count >= limit;
  const remainingMs = resetTime > now ? resetTime - now : 0;

  return {
    limit,
    count,
    resetTime,
    isLimitReached,
    remainingMs,
  };
}

export async function recordPublishedVehicle() {
  const data = await chrome.storage.local.get([
    "daily_publishing_limit",
    "daily_published_count",
    "daily_limit_reset_time",
  ]);

  let limit = Number(data.daily_publishing_limit) || DAILY_LIMIT_DEFAULT;
  let count = Number(data.daily_published_count) || 0;
  let resetTime = Number(data.daily_limit_reset_time) || 0;
  const now = Date.now();

  if (resetTime > 0 && now >= resetTime) {
    count = 0;
    resetTime = 0;
  }

  count++;

  // Set the 24-hour cycle timer on first publish if not already set
  if (!resetTime) {
    resetTime = now + RESET_INTERVAL_MS;
  }

  // If user reaches daily limit, ensure 24h timer is active
  if (count >= limit && (!resetTime || resetTime <= now)) {
    resetTime = now + RESET_INTERVAL_MS;
  }

  await chrome.storage.local.set({
    daily_published_count: count,
    daily_limit_reset_time: resetTime,
  });

  return {
    limit,
    count,
    resetTime,
    isLimitReached: count >= limit,
    remainingMs: resetTime > now ? resetTime - now : 0,
  };
}

export async function checkAndResetDailyLimit() {
  const data = await chrome.storage.local.get([
    "daily_limit_reset_time",
    "daily_published_count",
  ]);

  const resetTime = Number(data.daily_limit_reset_time) || 0;
  if (resetTime > 0 && Date.now() >= resetTime) {
    await chrome.storage.local.set({
      daily_published_count: 0,
      daily_limit_reset_time: 0,
    });
    return true;
  }
  return false;
}
