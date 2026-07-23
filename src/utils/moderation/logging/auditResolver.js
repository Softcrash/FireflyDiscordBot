const { PermissionFlagsBits, AuditLogEvent } = require('discord.js');

const MAX_BUFFER_PER_GUILD = 200;
const BUFFER_MAX_AGE_MS = 60 * 1000;
const FETCH_COOLDOWN_MS = 2000;
const SEEN_MAX_AGE_MS = 10 * 60 * 1000;

const AGGREGATED_TYPES = new Set([AuditLogEvent.MessageDelete]);

const buffers = new Map();
const seenCounts = new Map();
const lastFetch = new Map();
const warnedGuilds = new Set();

setInterval(() => {
  const now = Date.now();
  for (const [guildId, arr] of buffers) {
    const fresh = arr.filter((item) => now - item.receivedAt <= BUFFER_MAX_AGE_MS);
    if (fresh.length) buffers.set(guildId, fresh);
    else buffers.delete(guildId);
  }
  for (const [key, rec] of seenCounts) {
    if (now - rec.ts > SEEN_MAX_AGE_MS) seenCounts.delete(key);
  }
}, 30 * 1000).unref?.();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
1
/** Hat der Bot in dieser Guild "Audit-Log anzeigen"? */
function hasViewAuditLog(guild) {
  return guild?.members?.me?.permissions?.has(PermissionFlagsBits.ViewAuditLog) ?? false;
}

/** Wird von events/guildAuditLogEntryCreate/auditCollector.js gefüttert. */
function ingestAuditEntry(guild, entry) {
  if (!guild?.id || !entry) return;
  const arr = buffers.get(guild.id) ?? [];
  arr.push({ entry, receivedAt: Date.now() });
  while (arr.length > MAX_BUFFER_PER_GUILD) arr.shift();
  buffers.set(guild.id, arr);
}

function entryMatches(entry, { type, targetId, extraMatch }) {
  if (entry.action !== type) return false;
  if (targetId && entry.targetId !== targetId) return false;
  if (typeof extraMatch === 'function' && !extraMatch(entry)) return false;
  return true;
}

/**
 * Aggregierte Einträge: genau EINE Löschung zuordnen, wenn der aktuelle
 * count über dem bereits verbrauchten Stand liegt. Verbraucht wird pro
 * Zuordnung eine Einheit — so lassen sich auch schnelle Mehrfach-Löschungen
 * desselben Moderators einzeln korrekt zuordnen.
 */
function tryConsume(guildId, entry) {
  const key = `${guildId}:${entry.id}`;
  const count = Number(entry.extra?.count ?? 1);
  const rec = seenCounts.get(key) ?? { consumed: 0, ts: 0 };
  if (count > rec.consumed) {
    seenCounts.set(key, { consumed: rec.consumed + 1, ts: Date.now() });
    return true;
  }
  seenCounts.set(key, { consumed: rec.consumed, ts: Date.now() });
  return false;
}

async function materialize(guild, entry) {
  let executor = entry.executor ?? null;
  if (!executor && entry.executorId) {
    executor = await guild.client.users.fetch(entry.executorId).catch(() => null);
  }
  return { executor, reason: entry.reason ?? null, entry };
}

function searchBuffer(guildId, opts) {
  const arr = buffers.get(guildId);
  if (!arr?.length) return null;
  const now = Date.now();
  // Neueste zuerst
  for (let i = arr.length - 1; i >= 0; i--) {
    const { entry, receivedAt } = arr[i];
    if (now - receivedAt > opts.maxAgeMs) continue;
    if (!entryMatches(entry, opts)) continue;
    if (AGGREGATED_TYPES.has(entry.action)) {
      if (!tryConsume(guildId, entry)) continue;
    }
    return entry;
  }
  return null;
}

async function fetchFallback(guild, opts) {
  if (!hasViewAuditLog(guild)) {
    if (!warnedGuilds.has(guild.id)) {
      warnedGuilds.add(guild.id);
      console.warn(
        `[logging] ${guild.name} (${guild.id}): "Audit-Log anzeigen" fehlt — Ausführende können nicht ermittelt werden.`
      );
    }
    return null;
  }

  const now = Date.now();
  if (now - (lastFetch.get(guild.id) ?? 0) < FETCH_COOLDOWN_MS) return null;
  lastFetch.set(guild.id, now);

  let logs;
  try {
    logs = await guild.fetchAuditLogs({ type: opts.type, limit: 10 });
  } catch (err) {
    if (!warnedGuilds.has(guild.id)) {
      warnedGuilds.add(guild.id);
      console.warn(`[logging] fetchAuditLogs in ${guild.name} fehlgeschlagen:`, err?.message ?? err);
    }
    return null;
  }

  for (const entry of logs.entries.values()) {
    if (!entryMatches(entry, opts)) continue;
    if (AGGREGATED_TYPES.has(entry.action)) {
      if (!tryConsume(guild.id, entry)) continue;
      return entry;
    }
    if (Date.now() - entry.createdTimestamp > opts.maxAgeMs) continue;
    return entry;
  }
  return null;
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {{
 *   type: number,                       // AuditLogEvent.*
 *   targetId?: string|null,
 *   extraMatch?: (entry) => boolean,    // z.B. e => e.extra?.channel?.id === channelId
 *   maxAgeMs?: number,
 *   wait?: number,                      // Audit-Log ist eventual consistent
 * }} options
 * @returns {Promise<{ executor, reason, entry, source: 'event'|'fetch' } | null>}
 */
async function resolveExecutor(guild, options = {}) {
  const { type, targetId = null, extraMatch = null, maxAgeMs = 5000, wait = 0 } = options;
  if (!guild || type === undefined || type === null) return null;
  if (wait > 0) await sleep(wait);

  const opts = { type, targetId, extraMatch, maxAgeMs };

  const buffered = searchBuffer(guild.id, opts);
  if (buffered) return { ...(await materialize(guild, buffered)), source: 'event' };

  const fetched = await fetchFallback(guild, opts);
  if (fetched) return { ...(await materialize(guild, fetched)), source: 'fetch' };

  return null;
}

function clearGuild(guildId) {
  buffers.delete(guildId);
  lastFetch.delete(guildId);
  warnedGuilds.delete(guildId);
  for (const key of seenCounts.keys()) {
    if (key.startsWith(`${guildId}:`)) seenCounts.delete(key);
  }
}

module.exports = { resolveExecutor, ingestAuditEntry, hasViewAuditLog, clearGuild };