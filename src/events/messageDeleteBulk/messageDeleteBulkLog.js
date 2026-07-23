const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const {
  resolveExecutor,
  hasViewAuditLog,
} = require('../../utils/moderation/logging/auditResolver');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

function fmt(ts) {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
}

module.exports = async (client, messages, channel) => {
  const guild = channel?.guild ?? messages.first()?.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;

  const channelId = channel?.id ?? messages.first()?.channelId;
  if (
    !shouldLog(guild.id, 'message', 'messageDeleteBulk', {
      channelId,
      parentId: channel?.parentId ?? null,
    })
  ) {
    return;
  }

  const total = messages.size;
  const cached = [...messages.values()]
    .filter((m) => !m.partial)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  // --- Ausführenden ermitteln (Target eines BulkDelete-Eintrags = Channel) ---
  let executorLine = null;
  let executorPlain = 'unbekannt';
  let reason = null;
  if (hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      targetId: channelId,
      wait: 1000,
    });
    if (resolved?.executor) {
      executorLine = `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`;
      executorPlain = `${resolved.executor.username} (${resolved.executor.id})`;
      reason = resolved.reason;
    } else {
      executorLine = '`unbekannt` *(kein Audit-Log-Eintrag gefunden)*';
    }
  }

  // --- Transkript (.txt) aus den gecachten Nachrichten ---
  const files = [];
  let rangeLine = '`—`';
  if (cached.length) {
    const first = cached[0].createdTimestamp;
    const last = cached[cached.length - 1].createdTimestamp;
    rangeLine = `<t:${Math.floor(first / 1000)}:f> – <t:${Math.floor(last / 1000)}:f>`;

    const header = [
      `Massenlöschung in #${channel?.name ?? channelId} (${guild.name})`,
      `Gelöscht am: ${fmt(Date.now())} UTC`,
      `Ausgeführt von: ${executorPlain}`,
      `Rekonstruierbar: ${cached.length} von ${total} Nachrichten`,
      '='.repeat(60),
      '',
    ].join('\n');

    const body = cached
      .map((m) => {
        const parts = [
          `[${fmt(m.createdTimestamp)} UTC] ${m.author?.username ?? 'unbekannt'} (${m.author?.id ?? '?'}):`,
          m.content?.length ? m.content : '— kein Textinhalt —',
        ];
        if (m.attachments?.size) {
          parts.push(`  Anhänge: ${m.attachments.map((a) => a.name).join(', ')}`);
        }
        return parts.join('\n');
      })
      .join('\n\n');

    files.push(
      new AttachmentBuilder(Buffer.from(`${header}${body}\n`, 'utf8'), {
        name: `massenloeschung_${channelId}_${Date.now()}.txt`,
      })
    );
  }

  // --- Embed ---
  const fields = [
    {
      name: 'Rekonstruierbar',
      value:
        `**${cached.length}** von **${total}** Nachrichten mit Inhalt` +
        (cached.length < total
          ? '\n*(ältere / nicht gecachte Nachrichten sind nicht rekonstruierbar)*'
          : '') +
        (cached.length ? '\n→ Details im Transkript-Anhang' : ''),
    },
    { name: 'Zeitraum (rekonstruierbar)', value: rangeLine },
  ];
  if (executorLine) fields.push({ name: '🧹 Ausgeführt von', value: executorLine });

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🧹',
    title: 'Massenlöschung',
    description: `**${total}** Nachrichten in <#${channelId}> gelöscht.`,
    reason,
    fields,
    footerId: channelId,
  });

  await logEvent(guild, 'message', embed, { files });
};