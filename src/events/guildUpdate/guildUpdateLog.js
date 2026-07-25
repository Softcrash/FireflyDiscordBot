const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { diffSimple, toFields } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const VERIFICATION_DE = { 0: 'Keine', 1: 'Niedrig', 2: 'Mittel', 3: 'Hoch', 4: 'Höchste' };

const FIELD_MAP = {
  name: 'Name',
  vanityURLCode: { label: 'Vanity-URL', format: (v) => (v ? `\`discord.gg/${v}\`` : '`—`') },
  afkChannelId: { label: 'AFK-Channel', format: (v) => (v ? `<#${v}>` : '`—`') },
  systemChannelId: { label: 'System-Channel', format: (v) => (v ? `<#${v}>` : '`—`') },
  verificationLevel: { label: 'Verifizierungsstufe', format: (v) => `\`${VERIFICATION_DE[v] ?? v}\`` },
};

module.exports = async (client, oldGuild, newGuild) => {
  if (!isEnabled(newGuild.id, 'logging')) return;
  if (!shouldLog(newGuild.id, 'server', 'guildUpdate', {})) return;

  const fields = toFields(diffSimple(oldGuild, newGuild, FIELD_MAP));

  if (oldGuild.icon !== newGuild.icon) {
    fields.push({
      name: 'Server-Icon',
      value: `${oldGuild.icon ? `[Vorher](${oldGuild.iconURL()})` : '`—`'} → ${newGuild.icon ? `[Nachher](${newGuild.iconURL()})` : '`entfernt`'}`,
    });
  }
  if (oldGuild.banner !== newGuild.banner) {
    fields.push({
      name: 'Server-Banner',
      value: `${oldGuild.banner ? `[Vorher](${oldGuild.bannerURL()})` : '`—`'} → ${newGuild.banner ? `[Nachher](${newGuild.bannerURL()})` : '`entfernt`'}`,
    });
  }

  if (!fields.length) return;

  const info = await executorInfo(newGuild, {
    types: AuditLogEvent.GuildUpdate,
    targetId: newGuild.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(newGuild.id, info.executor)) return;
  fields.push(...info.fields);

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🛠️',
    title: 'Servereinstellungen geändert',
    reason: info.reason,
    fields,
    footerId: newGuild.id,
  });
  await logEvent(newGuild, 'server', embed);
};