const { LogSetting } = require('../../../database/registry');

const cache = new Map();
let loaded = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeRow(row) {
  return {
    enabled: row.enabled !== false,
    ignoredChannels: new Set(asArray(row.ignoredChannels)),
    ignoredRoles: new Set(asArray(row.ignoredRoles)),
    ignoredUsers: new Set(asArray(row.ignoredUsers)),
    events: asObject(row.events),
    logBots: row.logBots === true,
  };
}

async function loadAll() {
  const rows = await LogSetting.findAll();
  cache.clear();
  for (const row of rows) cache.set(`${row.guildId}:${row.category}`, normalizeRow(row));
  loaded = true;
  return rows.length;
}

function primeFilterFromRow(row) {
  if (!row) return;
  cache.set(`${row.guildId}:${row.category}`, normalizeRow(row));
}

/**
 * Zentraler Guard aller Log-Handler.
 * ctx: { channel?, channelId?, parentId?, user?, userId?, member?, isBot? }
 * Channel-Prüfung berücksichtigt die Parent-Kategorie: ist die Kategorie
 * geignoret, sind alle Channels darin geignoret.
 */
function shouldLog(guildId, category, eventKey, ctx = {}) {
  if (!loaded) return true;

  const entry = cache.get(`${guildId}:${category}`);
  if (!entry) return true;
  if (!entry.enabled) return false;

  if (eventKey && entry.events[eventKey] === false) return false;

  const isBot = ctx.isBot ?? ctx.user?.bot ?? ctx.member?.user?.bot ?? false;
  if (isBot && !entry.logBots) return false;

  const channelId = ctx.channelId ?? ctx.channel?.id ?? null;
  const parentId = ctx.parentId ?? ctx.channel?.parentId ?? null;
  if (channelId && entry.ignoredChannels.has(channelId)) return false;
  if (parentId && entry.ignoredChannels.has(parentId)) return false;

  const userId = ctx.userId ?? ctx.user?.id ?? ctx.member?.id ?? null;
  if (userId && entry.ignoredUsers.has(userId)) return false;

  if (entry.ignoredRoles.size && ctx.member?.roles?.cache) {
    if (ctx.member.roles.cache.some((role) => entry.ignoredRoles.has(role.id))) return false;
  }

  return true;
}

function getFilter(guildId, category) {
  return (
    cache.get(`${guildId}:${category}`) ?? {
      enabled: true,
      ignoredChannels: new Set(),
      ignoredRoles: new Set(),
      ignoredUsers: new Set(),
      events: {},
      logBots: false,
    }
  );
}

/**
 * Write-Through-Update einzelner Filterfelder. Row-Erstellung AUSSCHLIESSLICH
 * über findOrCreate. JSON-Felder werden bei jedem Schreiben explizit gesetzt
 * (MariaDB erlaubt für JSON/TEXT keine DDL-Defaults).
 */
async function updateFilter(guildId, category, patch = {}) {
  const [row, created] = await LogSetting.findOrCreate({
    where: { guildId, category },
    defaults: {
      guildId,
      category,
      channelId: null,
      webhookId: null,
      webhookToken: null,
      enabled: true,
      ignoredChannels: [],
      ignoredRoles: [],
      ignoredUsers: [],
      events: {},
      logBots: false,
      ...patch,
    },
  });

  if (!created) {
    await row.update({
      ignoredChannels: patch.ignoredChannels ?? asArray(row.ignoredChannels),
      ignoredRoles: patch.ignoredRoles ?? asArray(row.ignoredRoles),
      ignoredUsers: patch.ignoredUsers ?? asArray(row.ignoredUsers),
      events: patch.events ?? asObject(row.events),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.logBots !== undefined ? { logBots: patch.logBots } : {}),
    });
  }

  primeFilterFromRow(row);
  return row;
}

function removeGuild(guildId) {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${guildId}:`)) cache.delete(key);
  }
}

module.exports = { loadAll, shouldLog, getFilter, updateFilter, primeFilterFromRow, removeGuild };