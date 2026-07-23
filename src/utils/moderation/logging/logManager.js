const { WebhookClient, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { LogSetting } = require('../../../database/registry');
const { COLORS } = require('./logConstants');
const { primeFilterFromRow } = require('./logFilter');

const WEBHOOK_NAME = 'Firefly Logs';

const FLUSH_DEBOUNCE_MS = 750;
const MAX_BATCH = 10;
const MAX_QUEUE = 500;
const MAX_ATTEMPTS = 3;
const STORM_THRESHOLD = 200;
const STORM_WINDOW_MS = 60 * 1000;
const STORM_DURATION_MS = 5 * 60 * 1000;

const webhookCache = new Map();
const queues = new Map();

class MissingWebhookPermission extends Error {
  constructor() {
    super('Missing ManageWebhooks permission');
    this.name = 'MissingWebhookPermission';
  }
}

class WebhookTokenUnavailable extends Error {
  constructor() {
    super('Webhook token unavailable');
    this.name = 'WebhookTokenUnavailable';
  }
}

async function resolveWebhook(guildId, category) {
  const cacheKey = `${guildId}:${category}`;
  const cached = webhookCache.get(cacheKey);
  if (cached) return cached;

  const setting = await LogSetting.findOne({ where: { guildId, category } });
  if (!setting?.enabled || !setting.webhookId || !setting.webhookToken) return null;

  const client = new WebhookClient({ id: setting.webhookId, token: setting.webhookToken });
  webhookCache.set(cacheKey, client);
  return client;
}

// ---------- Queue ----------

function getQueue(guildId, category) {
  const key = `${guildId}:${category}`;
  let q = queues.get(key);
  if (!q) {
    q = {
      key,
      guildId,
      category,
      items: [],
      timer: null,
      sending: false,
      dropped: 0,
      blockedUntil: 0,
      windowStart: 0,
      windowCount: 0,
      stormUntil: 0,
      stormSuppressed: 0,
    };
    queues.set(key, q);
  }
  return q;
}

function enqueue(q, item) {
  if (q.items.length >= MAX_QUEUE) {
    q.items.shift();
    q.dropped += 1;
  }
  q.items.push(item);
}

function scheduleFlush(q, delayMs = FLUSH_DEBOUNCE_MS) {
  if (q.timer || q.sending) return;
  const wait = Math.max(delayMs, q.blockedUntil - Date.now());
  q.timer = setTimeout(() => {
    q.timer = null;
    flushQueue(q).catch((err) => console.error('[logging] flush:', err));
  }, wait);
  q.timer.unref?.();
}

function buildDropNotice(count) {
  return new EmbedBuilder()
    .setColor(COLORS.update)
    .setDescription(`\`⚠️\` **${count}** Log-Einträge wegen Queue-Überlauf verworfen.`)
    .setTimestamp();
}

function buildStormNotice() {
  return new EmbedBuilder()
    .setColor(COLORS.update)
    .setDescription(
      '`🌩️` **Sammelmodus aktiv** — sehr hohes Log-Aufkommen. Einzelne Einträge werden für 5 Minuten unterdrückt und anschließend zusammengefasst.'
    )
    .setTimestamp();
}

function buildStormSummary(count) {
  return new EmbedBuilder()
    .setColor(COLORS.update)
    .setDescription(`\`🌩️\` **Sammelmodus beendet** — **${count}** Einträge wurden unterdrückt.`)
    .setTimestamp();
}

/**
 * Reiht ein Embed in die Log-Queue der Kategorie ein und kehrt sofort zurück.
 * opts.files: Array (AttachmentBuilder / { attachment, name }) — Items mit
 * Files werden einzeln gesendet.
 */
async function logEvent(guild, category, embed, opts = {}) {
  if (!guild?.id || !embed) return;
  const q = getQueue(guild.id, category);
  const now = Date.now();

  if (now - q.windowStart > STORM_WINDOW_MS) {
    q.windowStart = now;
    q.windowCount = 0;
  }
  q.windowCount += 1;

  if (q.stormUntil) {
    if (now < q.stormUntil) {
      q.stormSuppressed += 1;
      return;
    }
    if (q.stormSuppressed > 0) {
      enqueue(q, { embed: buildStormSummary(q.stormSuppressed), files: null, attempts: 0 });
    }
    q.stormUntil = 0;
    q.stormSuppressed = 0;
  }

  if (q.windowCount > STORM_THRESHOLD) {
    q.stormUntil = now + STORM_DURATION_MS;
    q.stormSuppressed = 1; // das aktuelle Event ist das erste unterdrückte
    enqueue(q, { embed: buildStormNotice(), files: null, attempts: 0 });
    scheduleFlush(q);
    return;
  }

  enqueue(q, { embed, files: opts.files ?? null, attempts: 0 });
  scheduleFlush(q);
}

async function flushQueue(q) {
  if (q.sending || !q.items.length) return;
  q.sending = true;
  try {
    let webhook;
    try {
      webhook = await resolveWebhook(q.guildId, q.category);
    } catch (err) {
      console.error(`[logging] resolveWebhook (${q.category}):`, err);
      q.items = [];
      return;
    }
    if (!webhook) {
      q.items = [];
      q.dropped = 0;
      return;
    }

    if (q.dropped > 0) {
      q.items.unshift({ embed: buildDropNotice(q.dropped), files: null, attempts: 0 });
      q.dropped = 0;
    }

    while (q.items.length) {
      let batch;
      if (q.items[0].files?.length) {
        batch = [q.items.shift()];
      } else {
        batch = [];
        while (batch.length < MAX_BATCH && q.items.length && !q.items[0].files?.length) {
          batch.push(q.items.shift());
        }
      }
      const ok = await sendBatch(q, webhook, batch);
      if (!ok) return;
    }
  } finally {
    q.sending = false;
    if (q.items.length) scheduleFlush(q);
  }
}

async function sendBatch(q, webhook, batch) {
  try {
    await webhook.send({
      username: WEBHOOK_NAME,
      embeds: batch.map((item) => item.embed),
      files: batch.length === 1 && batch[0].files?.length ? batch[0].files : undefined,
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (err) {
    if (err?.code === 10015) {
      webhookCache.delete(q.key);
      await LogSetting.update(
        { webhookId: null, webhookToken: null },
        { where: { guildId: q.guildId, category: q.category } }
      ).catch(() => {});
      q.items = [];
      q.dropped = 0;
      return false;
    }

    if (err?.status === 429 || err?.name === 'RateLimitError') {
      const retry = [];
      let discarded = 0;
      for (const item of batch) {
        item.attempts += 1;
        if (item.attempts < MAX_ATTEMPTS) retry.push(item);
        else discarded += 1;
      }
      if (discarded) {
        console.warn(
          `[logging] ${discarded} Einträge nach ${MAX_ATTEMPTS} Rate-Limit-Versuchen verworfen (${q.key})`
        );
      }
      q.items.unshift(...retry);
      q.blockedUntil = Date.now() + Math.min(2000 * (retry[0]?.attempts ?? 1), 10000);
      return false;
    }

    console.error(`[logging] send (${q.category}):`, err);
    return true;
  }
}

async function flushAllQueues() {
  const pending = [];
  for (const q of queues.values()) {
    if (q.timer) {
      clearTimeout(q.timer);
      q.timer = null;
    }
    q.blockedUntil = 0;
    pending.push(flushQueue(q).catch(() => {}));
  }
  await Promise.allSettled(pending);
}

function removeGuild(guildId) {
  for (const key of [...queues.keys()]) {
    if (key.startsWith(`${guildId}:`)) {
      const q = queues.get(key);
      if (q?.timer) clearTimeout(q.timer);
      queues.delete(key);
    }
  }
  for (const key of [...webhookCache.keys()]) {
    if (key.startsWith(`${guildId}:`)) webhookCache.delete(key);
  }
}

// ---------- Konfiguration ----------
async function getConfig(guildId) {
  const rows = await LogSetting.findAll({ where: { guildId } });
  const map = {};
  for (const row of rows) map[row.category] = row;
  return map;
}

/**
 * Setzt den Zielchannel einer Kategorie:
 *  - prüft ManageWebhooks im Zielchannel
 *  - entfernt einen evtl. alten Webhook der Kategorie (sauberes Reconfigure)
 *  - erstellt einen neuen Webhook, sichert das Token und persistiert id + token
 *  - JSON-Filterfelder werden bei CREATE explizit mitgesetzt (NOT NULL!)
 */
async function setLogChannel(guild, category, channel) {
  const me = guild.members.me ?? (await guild.members.fetchMe());
  if (!me.permissionsIn(channel).has(PermissionFlagsBits.ManageWebhooks)) {
    throw new MissingWebhookPermission();
  }

  const existing = await LogSetting.findOne({ where: { guildId: guild.id, category } });

  if (existing?.webhookId) {
    if (existing.webhookToken) {
      const old = new WebhookClient({ id: existing.webhookId, token: existing.webhookToken });
      await old.delete('Logging neu konfiguriert').catch(() => {});
    } else if (existing.channelId) {
      const oldChannel =
        guild.channels.cache.get(existing.channelId) ??
        (await guild.channels.fetch(existing.channelId).catch(() => null));
      if (oldChannel) {
        const hooks = await oldChannel.fetchWebhooks().catch(() => null);
        await hooks
          ?.get(existing.webhookId)
          ?.delete('Logging neu konfiguriert')
          .catch(() => {});
      }
    }
  }

  const webhook = await channel.createWebhook({
    name: WEBHOOK_NAME,
    reason: `Logging: ${category}`,
  });

  let token = webhook.token ?? null;
  if (!token) {
    const hooks = await channel.fetchWebhooks().catch(() => null);
    token = hooks?.get(webhook.id)?.token ?? null;
    console.warn(
      `[logging] createWebhook ohne Token (id=${webhook.id}). ` +
        `fetchWebhooks-Fallback: ${token ? 'Token erhalten ✅' : 'weiterhin kein Token ❌'}`
    );
  }

  if (!token) {
    await webhook.delete('Kein Token erhalten').catch(() => {});
    throw new WebhookTokenUnavailable();
  }

  let row;
  if (existing) {
    await existing.update({
      channelId: channel.id,
      webhookId: webhook.id,
      webhookToken: token,
      enabled: true,
      ignoredChannels: existing.ignoredChannels ?? [],
      ignoredRoles: existing.ignoredRoles ?? [],
      ignoredUsers: existing.ignoredUsers ?? [],
      events: existing.events ?? {},
    });
    row = existing;
  } else {
    row = await LogSetting.create({
      guildId: guild.id,
      category,
      channelId: channel.id,
      webhookId: webhook.id,
      webhookToken: token,
      enabled: true,
      ignoredChannels: [],
      ignoredRoles: [],
      ignoredUsers: [],
      events: {},
      logBots: false,
    });
  }

  webhookCache.delete(`${guild.id}:${category}`);
  primeFilterFromRow(row);
  return webhook;
}

module.exports = {
  logEvent,
  flushAllQueues,
  removeGuild,
  getConfig,
  setLogChannel,
  MissingWebhookPermission,
  WebhookTokenUnavailable,
  WEBHOOK_NAME,
};