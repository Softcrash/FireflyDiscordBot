const { EmbedBuilder } = require('discord.js');
const { PluginNotifySetting } = require('../../database/registry');
const { getPlugin } = require('./pluginRegistry');
const mConfig = require('../../messageConfig.json');

/**
 * Setzt den Benachrichtigungs-Channel einer Guild.
 * Row-Erstellung über findOrCreate (nie implizit).
 * @param {string} guildId
 * @param {string} channelId
 */
async function setNotifyChannel(guildId, channelId) {
  const [row, created] = await PluginNotifySetting.findOrCreate({
    where: { guildId },
    defaults: { guildId, channelId },
  });
  if (!created) {
    await row.update({ channelId });
  }
  return row;
}

/**
 * Entfernt den Benachrichtigungs-Channel.
 * @param {string} guildId
 * @returns {Promise<boolean>} true, wenn eine Row gelöscht wurde
 */
async function clearNotifyChannel(guildId) {
  const deleted = await PluginNotifySetting.destroy({ where: { guildId } });
  return deleted > 0;
}

/**
 * @param {string} guildId
 * @returns {Promise<string|null>} Channel-ID oder null
 */
async function getNotifyChannel(guildId) {
  const row = await PluginNotifySetting.findOne({ where: { guildId } });
  return row?.channelId ?? null;
}

/**
 * Sendet die Statusänderung in den konfigurierten Channel.
 * Tut nichts, wenn kein Channel konfiguriert ist.
 *
 * @param {import('discord.js').Guild} guild
 * @param {object}  change
 * @param {string}  change.pluginId
 * @param {boolean} change.enabled
 * @param {import('discord.js').User|null} [change.actor]  null/undefined = System
 * @param {boolean} [change.autoDisabled]
 * @param {string|null} [change.disabledReason]
 */
async function sendPluginNotification(guild, change) {
  try {
    const channelId = await getNotifyChannel(guild.id);
    if (!channelId) return;

    let channel = guild.channels.cache.get(channelId);
    if (!channel) {
      try {
        channel = await guild.channels.fetch(channelId);
      } catch (err) {
        // 10003 = Unknown Channel → wurde gelöscht, tote Konfiguration aufräumen
        if (err?.code === 10003) {
          await clearNotifyChannel(guild.id).catch(() => {});
          console.warn(
            `[plugins] Notify-Channel ${channelId} in Guild ${guild.id} existiert nicht mehr — Einstellung entfernt`
          );
        } else {
          console.error('[plugins] Notify-Channel-Fetch fehlgeschlagen:', err);
        }
        return;
      }
    }

    const plugin = getPlugin(change.pluginId);
    const name = plugin?.name ?? change.pluginId;
    const enabled = change.enabled;

    const embed = new EmbedBuilder()
      .setColor(enabled ? `#${mConfig.embedColorSuccess}` : `#${mConfig.embedColorError}`)
      .setTitle(enabled ? '🔌 Plugin aktiviert' : '🔌 Plugin deaktiviert')
      .setDescription(`Das Modul **${name}** wurde ${enabled ? 'aktiviert' : 'deaktiviert'}.`)
      .addFields({
        name: 'Ausgelöst von',
        value: change.actor
          ? `${change.actor} (\`${change.actor.tag}\`)`
          : '⚙️ System (automatisch)',
      })
      .setTimestamp();

    if (!enabled && change.autoDisabled && change.disabledReason) {
      embed.addFields({ name: 'Grund', value: change.disabledReason });
    }

    await channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    // z.B. 50013 Missing Permissions — loggen, aber niemals werfen
    console.error('[plugins] Benachrichtigung senden fehlgeschlagen:', err);
  }
}

module.exports = {
  setNotifyChannel,
  clearNotifyChannel,
  getNotifyChannel,
  sendPluginNotification,
};