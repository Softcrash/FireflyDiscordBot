const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { channelTypeName, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, thread, newlyCreated) => {
  if (!newlyCreated) return;
  const guild = thread.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'thread', { channelId: thread.id, parentId: thread.parentId })) return;

  const owner = thread.ownerId ? await client.users.fetch(thread.ownerId).catch(() => null) : null;
  if (skipBotExecutor(guild.id, owner)) return;

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '🧵',
    title: 'Thread erstellt',
    target: thread,
    fields: [
      { name: 'Typ', value: `\`${channelTypeName(thread.type)}\``, inline: true },
      { name: 'Eltern-Channel', value: thread.parentId ? `<#${thread.parentId}>` : '`—`', inline: true },
      { name: 'Erstellt von', value: thread.ownerId ? `<@${thread.ownerId}> (\`${thread.ownerId}\`)` : '`unbekannt`' },
    ],
    footerId: thread.id,
  });
  await logEvent(guild, 'server', embed);
};