const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent, WEBHOOK_NAME } = require('../../utils/moderation/logging/logManager');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const ACTION_DE = {
  [AuditLogEvent.WebhookCreate]: 'erstellt',
  [AuditLogEvent.WebhookDelete]: 'gelöscht',
  [AuditLogEvent.WebhookUpdate]: 'geändert',
};

module.exports = async (client, channel) => {
  const guild = channel.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'webhookUpdate', { channelId: channel.id, parentId: channel.parentId })) return;

  const info = await executorInfo(guild, {
    types: [AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookDelete, AuditLogEvent.WebhookUpdate],
    extraMatch: (e) => {
      const chId =
        e.target?.channelId ??
        e.changes?.find((c) => c.key === 'channel_id')?.new ??
        e.changes?.find((c) => c.key === 'channel_id')?.old ??
        null;
      return !chId || chId === channel.id;
    },
    label: '👮 Ausgeführt von',
  });

  const hookName =
    info.entry?.target?.name ??
    info.entry?.changes?.find((c) => c.key === 'name')?.new ??
    info.entry?.changes?.find((c) => c.key === 'name')?.old ??
    null;
  if (info.executor?.id === client.user.id && hookName === WEBHOOK_NAME) return;
  if (skipBotExecutor(guild.id, info.executor)) return;

  const what = info.entry ? ACTION_DE[info.entry.action] ?? 'geändert' : 'geändert';

  const embed = buildLogEmbed({
    action: info.entry?.action === AuditLogEvent.WebhookDelete ? 'delete' : 'update',
    emoji: '🪝',
    title: `Webhook ${what}`,
    reason: info.reason,
    fields: [
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      ...(hookName ? [{ name: 'Webhook', value: `\`${hookName}\``, inline: true }] : []),
      ...info.fields,
    ],
    footerId: channel.id,
  });
  await logEvent(guild, 'server', embed);
};