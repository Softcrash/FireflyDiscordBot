const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, invite) => {
  const guild = invite.guild ? client.guilds.cache.get(invite.guild.id) : null;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'invite', { channelId: invite.channelId })) return;
  if (skipBotExecutor(guild.id, invite.inviter)) return; // Widget-/Bot-Invites

  const expires = invite.expiresTimestamp
    ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`
    : '`nie`';

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '✉️',
    title: 'Einladung erstellt',
    fields: [
      { name: 'Code', value: `\`discord.gg/${invite.code}\``, inline: true },
      { name: 'Ziel-Channel', value: invite.channelId ? `<#${invite.channelId}>` : '`—`', inline: true },
      {
        name: 'Erstellt von',
        value: invite.inviter ? `${invite.inviter} (\`${invite.inviter.id}\`)` : '`unbekannt`',
      },
      { name: 'Läuft ab', value: expires, inline: true },
      { name: 'Max. Nutzungen', value: invite.maxUses ? `\`${invite.maxUses}\`` : '`∞`', inline: true },
    ],
    footerId: invite.code,
  });
  await logEvent(guild, 'server', embed);
};