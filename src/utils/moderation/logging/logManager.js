const { WebhookClient, PermissionFlagsBits } = require('discord.js');
const { LogSetting } = require('../../../database/registry');

const WEBHOOK_NAME = 'Firefly Logs';

// Cache: `${guildId}:${category}` -> WebhookClient (vermeidet ständige Re-Instanziierung)
const webhookCache = new Map();

class MissingWebhookPermission extends Error {
  constructor() {
    super('Missing ManageWebhooks permission');
    this.name = 'MissingWebhookPermission';
  }
}

// Discord liefert das Token application-eigener Webhooks nur an die erstellende
// App — und nicht immer am frisch erstellten Objekt. Wenn wir es weder direkt
// noch per fetchWebhooks bekommen, ist der Webhook unbrauchbar.
class WebhookTokenUnavailable extends Error {
  constructor() {
    super('Webhook token unavailable');
    this.name = 'WebhookTokenUnavailable';
  }
}

// Webhook-Usernamen dürfen "discord"/"clyde" nicht enthalten und max. 80 Zeichen lang sein.
function safeUsername(name) {
  if (!name) return WEBHOOK_NAME;
  const lowered = name.toLowerCase();
  if (lowered.includes('discord') || lowered.includes('clyde')) return WEBHOOK_NAME;
  return name.slice(0, 80);
}

async function resolveWebhook(guild, category) {
  const cacheKey = `${guild.id}:${category}`;
  const cached = webhookCache.get(cacheKey);
  if (cached) return cached;

  const setting = await LogSetting.findOne({ where: { guildId: guild.id, category } });
  if (!setting?.enabled || !setting.webhookId || !setting.webhookToken) return null;

  const client = new WebhookClient({ id: setting.webhookId, token: setting.webhookToken });
  webhookCache.set(cacheKey, client);
  return client;
}

/**
 * Sendet ein Embed per Webhook in den konfigurierten Channel der Kategorie.
 * Tut nichts, wenn die Kategorie nicht (mehr) konfiguriert ist.
 */
async function logEvent(guild, category, embed, { username, avatarURL } = {}) {
  if (!guild) return;

  let webhook;
  try {
    webhook = await resolveWebhook(guild, category);
  } catch (err) {
    console.error(`[logging] resolveWebhook (${category}):`, err);
    return;
  }
  if (!webhook) return;

  try {
    await webhook.send({
      username: safeUsername(username),
      avatarURL: avatarURL ?? undefined,
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    // 10015 = Unknown Webhook → wurde manuell gelöscht, Eintrag säubern
    if (err?.code === 10015) {
      webhookCache.delete(`${guild.id}:${category}`);
      await LogSetting.update(
        { webhookId: null, webhookToken: null },
        { where: { guildId: guild.id, category } }
      ).catch(() => {});
    } else {
      console.error(`[logging] send (${category}):`, err);
    }
  }
}

// Aktuelle Konfiguration einer Guild als { [category]: LogSetting } zurückgeben.
async function getConfig(guildId) {
  const rows = await LogSetting.findAll({ where: { guildId } });
  const map = {};
  for (const row of rows) map[row.category] = row;
  return map;
}

/**
 * Setzt den Zielchannel einer Kategorie:
 *  - prüft die ManageWebhooks-Berechtigung im Zielchannel
 *  - entfernt einen evtl. alten Webhook der Kategorie (sauberes Reconfigure)
 *  - erstellt einen neuen Webhook, sichert das Token und persistiert id + token
 */
async function setLogChannel(guild, category, channel) {
  const me = guild.members.me ?? (await guild.members.fetchMe());
  if (!me.permissionsIn(channel).has(PermissionFlagsBits.ManageWebhooks)) {
    throw new MissingWebhookPermission();
  }

  const existing = await LogSetting.findOne({ where: { guildId: guild.id, category } });

  // Alten Webhook der Kategorie entfernen (sauberes Reconfigure).
  if (existing?.webhookId) {
    if (existing.webhookToken) {
      const old = new WebhookClient({ id: existing.webhookId, token: existing.webhookToken });
      await old.delete('Logging neu konfiguriert').catch(() => {});
    } else if (existing.channelId) {
      // Kein Token gespeichert → per Bot-Auth im (ggf. alten) Channel löschen.
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

  // Token ermitteln. Bei application-eigenen Webhooks ist webhook.token am frisch
  // erstellten Objekt nicht immer gesetzt → erneut über fetchWebhooks laden.
  let token = webhook.token ?? null;
  if (!token) {
    const hooks = await channel.fetchWebhooks().catch(() => null);
    token = hooks?.get(webhook.id)?.token ?? null;
    console.warn(
      `[logging] createWebhook ohne Token (id=${webhook.id}). ` +
        `fetchWebhooks-Fallback: ${token ? 'Token erhalten ✅' : 'weiterhin kein Token ❌'}`
    );
  }

  // Ohne Token ist der Webhook unbrauchbar → aufräumen und Fehler melden,
  // statt still NULL zu speichern (das würde stilles Nicht-Loggen verursachen).
  if (!token) {
    await webhook.delete('Kein Token erhalten').catch(() => {});
    throw new WebhookTokenUnavailable();
  }

  if (existing) {
    await existing.update({
      channelId: channel.id,
      webhookId: webhook.id,
      webhookToken: token,
      enabled: true,
    });
  } else {
    await LogSetting.create({
      guildId: guild.id,
      category,
      channelId: channel.id,
      webhookId: webhook.id,
      webhookToken: token,
      enabled: true,
    });
  }

  webhookCache.delete(`${guild.id}:${category}`);
  return webhook;
}

module.exports = {
  logEvent,
  getConfig,
  setLogChannel,
  MissingWebhookPermission,
  WebhookTokenUnavailable,
  WEBHOOK_NAME,
};