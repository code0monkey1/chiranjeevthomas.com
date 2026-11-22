/**
 * The chat route's daily limits. Best effort: counters live in this function instance's memory and reset
 * on cold starts. Kept out of the route file because a Next route may only export its handlers.
 */
const DAILY_LIMIT = () => Number(process.env.CHAT_DAILY_LIMIT || 30);
/** Ceiling across all visitors (per function instance), so one abuser can't burn the free Groq/Pinecone quota. */
const GLOBAL_DAILY_LIMIT = () => Number(process.env.CHAT_GLOBAL_DAILY_LIMIT || 500);
/** Background upgrade runs per instance per day, separate from visitor questions. */
const UPGRADE_DAILY_LIMIT = () => Number(process.env.CHAT_UPGRADE_DAILY_LIMIT || 50);
const MAX_TRACKED_IPS = 5000;

let today = "";
let total = 0;
let upgrades = 0;
const hits = new Map<string, number>();

function rollDay() {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== today) { today = day; total = 0; upgrades = 0; hits.clear(); } // drop yesterday's counters
}

/** Counts one visitor question; true when the visitor or the instance is over its limit. */
export function limited(ip: string): boolean {
  rollDay();
  if (total >= GLOBAL_DAILY_LIMIT()) return true;
  if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) hits.delete(hits.keys().next().value!); // bounded memory
  const n = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, n);
  if (n > DAILY_LIMIT()) return true;
  total += 1;
  return false;
}

/**
 * Background upgrades get their own small daily budget, so free cache hits can never use up the visitors'
 * shared quota. No visitor pays for them. False once the budget is spent, or the visitor ceiling is already reached.
 */
export function takeUpgrade(): boolean {
  rollDay();
  if (total >= GLOBAL_DAILY_LIMIT() || upgrades >= UPGRADE_DAILY_LIMIT()) return false;
  upgrades += 1;
  return true;
}

/** Evals only: forget all counters. */
export function resetLimiter() { today = ""; total = 0; upgrades = 0; hits.clear(); }
