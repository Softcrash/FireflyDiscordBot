const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, event) => {
  const guild = event.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'scheduledEvent', {})) return;

  const creator = event.creatorId ? await client.users.fetch(event.creatorId).catch(() => null) : null;
  if (skipBotExecutor(guild.id, creator)) return;

  const start = event.scheduledStartTimestamp
    ? `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F> · <t:${Math.floor(event.scheduledStartTimestamp / 1000)}:R>`
    : '`—`';
  const location = event.channelId
    ? `<#${event.channelId}>`
    : event.entityMetadata?.location
    ? `\`${event.entityMetadata.location}\``
    : '`—`';

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '📅',
    title: 'Geplantes Event erstellt',
    target: { name: event.name, id: event.id },
    fields: [
      { name: 'Start', value: start },
      { name: 'Ort', value: location, inline: true },
      {
        name: 'Erstellt von',
        value: event.creatorId ? `<@${event.creatorId}> (\`${event.creatorId}\`)` : '`unbekannt`',
        inline: true,
      },
    ],
    footerId: event.id,
  });
  await logEvent(guild, 'server', embed);
};