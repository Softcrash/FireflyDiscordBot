const { MessageFlags } = require('discord.js');
const { PluginSetting } = require('../../database/registry');
const { getPlugin, isValidPluginId, getAllPlugins } = require('./pluginRegistry');

const cache = new Map();

let loaded = false;

/**
 * Lädt alle Plugin-Einstellungen aus der DB in den Cache.
 * Wird in src/events/clientReady/loadPlugins.js aufgerufen.
 * @returns {Promise<number>} Anzahl geladener Rows
 */
async function loadAll() {
  const rows = await PluginSetting.findAll();
  cache.clear();
  for (const row of rows) {
    cache.set(`${row.guildId}:${row.pluginId}`, {
      enabled: row.enabled,
      autoDisabled: row.autoDisabled,
      disabledReason: row.disabledReason,
    });
  }
  loaded = true;
  return rows.length;
}

/**
 * Synchroner Status-Check — reiner Map-Lookup, keine DB-Last pro Interaction.
 * Fail-Open bei: unbekannter Plugin-ID, noch nicht geladenem Cache.
 * Ohne Row gilt defaultEnabled aus der Registry.
 * @param {string} guildId
 * @param {string} pluginId
 * @returns {boolean}
 */
function isEnabled(guildId, pluginId) {
  if (!isValidPluginId(pluginId)) return true;
  if (!loaded) return true;

  const entry = cache.get(`${guildId}:${pluginId}`);
  if (entry) return entry.enabled;
  return getPlugin(pluginId).defaultEnabled;
}

/**
 * Setzt den Status eines Plugins — Write-Through: erst DB, dann Cache.
 * Row-Erstellung ausschließlich über findOrCreate (nie implizit).
 * @param {string}  guildId
 * @param {string}  pluginId
 * @param {boolean} enabled
 * @param {{ autoDisabled?: boolean, disabledReason?: string|null }} [opts]
 */
async function setEnabled(guildId, pluginId, enabled, opts = {}) {
  const autoDisabled = opts.autoDisabled ?? false;
  const disabledReason = opts.disabledReason ?? null;

  const [row, created] = await PluginSetting.findOrCreate({
    where: { guildId, pluginId },
    defaults: { guildId, pluginId, enabled, autoDisabled, disabledReason },
  });

  if (!created) {
    await row.update({ enabled, autoDisabled, disabledReason });
  }

  cache.set(`${guildId}:${pluginId}`, { enabled, autoDisabled, disabledReason });
  return row;
}

/**
 * Effektiver Status aller registrierten Plugins einer Guild (für /plugin list).
 * @param {string} guildId
 */
function getGuildStates(guildId) {
  return getAllPlugins().map((plugin) => {
    const entry = cache.get(`${guildId}:${plugin.id}`);
    return {
      plugin,
      enabled: entry ? entry.enabled : plugin.defaultEnabled,
      autoDisabled: entry?.autoDisabled ?? false,
      disabledReason: entry?.disabledReason ?? null,
    };
  });
}

/**
 * Zentraler Gate-Check für alle vier Validatoren.
 * Gibt true zurück, wenn die Interaction geblockt (und beantwortet) wurde —
 * der Validator bricht dann mit `return` ab.
 *
 * Fail-Open-Fälle (return false, Handler läuft normal):
 *  - Handler hat kein category-Feld
 *  - Interaction ohne Guild-Kontext (DMs)
 *  - Plugin aktiv, unbekannte Plugin-ID oder Cache noch nicht geladen
 *
 * @param {import('discord.js').Interaction} interaction
 * @param {{ category?: string }} handler
 * @returns {Promise<boolean>} true = geblockt
 */
async function gateInteraction(interaction, handler) {
  const category = handler?.category;
  if (!category) return false;
  if (!interaction.guild) return false;
  if (isEnabled(interaction.guild.id, category)) return false;

  const name = getPlugin(category)?.name ?? category;
  try {
    await interaction.reply({
      content: `\`🔌\` Das Modul **${name}** ist auf diesem Server deaktiviert.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('[plugins] Gate-Reply fehlgeschlagen:', err);
  }
  return true;
}

module.exports = { loadAll, isEnabled, setEnabled, getGuildStates, gateInteraction };