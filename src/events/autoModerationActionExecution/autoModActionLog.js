const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const ACTION_DE = { 1: 'Nachricht blockiert', 2: 'Alarm gesendet', 3: 'Timeout verhängt' };

module.exports = async (client, execution) => {
  const guild = execution.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (
    !shouldLog(guild.id, 'server', 'autoMod', {
      channelId: execution.channelId ?? null,
      userId: execution.userId,
    })
  ) {
    return;
  }

  const fields = [
    { name: 'User', value: `<@${execution.userId}> (\`${execution.userId}\`)`, inline: true },
    {
      name: 'Aktion',
      value: `\`${ACTION_DE[execution.action?.type] ?? execution.action?.type ?? '?'}\``,
      inline: true,
    },
    {
      name: 'Regel',
      value: execution.autoModerationRule
        ? `\`${execution.autoModerationRule.name}\``
        : `\`${execution.ruleId}\``,
      inline: true,
    },
  ];
  if (execution.channelId) {
    fields.push({ name: 'Channel', value: `<#${execution.channelId}>`, inline: true });
  }
  if (execution.matchedKeyword) {
    fields.push({ name: 'Getroffenes Schlüsselwort', value: `\`${execution.matchedKeyword}\`` });
  }
  if (execution.matchedContent) {
    fields.push({ name: 'Getroffener Inhalt', value: execution.matchedContent });
  }

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🛡️',
    title: 'AutoMod ausgelöst',
    fields,
    footerId: execution.userId,
  });
  await logEvent(guild, 'server', embed);
};