const { AuditLogEvent, AttachmentBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const {
  resolveExecutor,
  hasViewAuditLog,
} = require('../../utils/moderation/logging/auditResolver');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '?';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

module.exports = async (client, message) => {
  const guild = message.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (message.webhookId) return;

  const author = message.partial ? null : message.author ?? null;

  if (
    !shouldLog(guild.id, 'message', 'messageDelete', {
      channelId: message.channelId,
      parentId: message.channel?.parentId ?? null,
      user: author,
      member: message.member ?? null,
      isBot: author?.bot ?? false,
    })
  ) {
    return;
  }

  let deletedBy = null;
  let reason = null;
  if (hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: AuditLogEvent.MessageDelete,
      targetId: author?.id ?? null,
      extraMatch: (e) => e.extra?.channel?.id === message.channelId,
      wait: 1500,
    });

    if (resolved?.executor && resolved.executor.id !== author?.id) {
      deletedBy = `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`;
      reason = resolved.reason;
    } else if (resolved?.executor) {
      deletedBy = 'Autor selbst — laut Audit-Log';
    } else {
      deletedBy = author
        ? 'Autor selbst *(kein Audit-Log-Eintrag)*'
        : 'vermutlich Autor selbst *(kein Audit-Log-Eintrag)*';
    }
  }

  // --- Inhalt bestimmen ---
  let content;
  let cacheNote = false;
  if (message.partial) {
    content = '`— Nachricht war nicht im Cache —`';
    cacheNote = true;
  } else if (message.content?.length) {
    content = message.content;
  } else {
    content = '`— kein Textinhalt —`';
  }

  const files = [];
  if (!message.partial && (message.content?.length ?? 0) > 1024) {
    files.push(
      new AttachmentBuilder(Buffer.from(message.content, 'utf8'), {
        name: `geloeschte_nachricht_${message.id}.txt`,
      })
    );
    content = `${message.content.slice(0, 950)}…\n*(vollständiger Inhalt im Anhang)*`;
  }

  // --- Embed ---
  const lines = [
    `**Autor:** ${author ? `${author} (\`${author.id}\`)` : '`unbekannt — nicht im Cache`'}`,
    `**Kanal:** <#${message.channelId}>`,
    `**Gesendet:** <t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
  ];
  if (message.reference?.messageId) {
    const ref = message.reference;
    lines.push(
      `**Antwort auf:** [Nachricht](https://discord.com/channels/${guild.id}/${ref.channelId ?? message.channelId}/${ref.messageId})`
    );
  }

  const fields = [{ name: 'Inhalt', value: content }];

  if (!message.partial && message.attachments?.size) {
    const list = message.attachments
      .map((a) => `📎 [\`${a.name}\`](${a.url}) · ${formatBytes(a.size)} · ${a.contentType ?? 'unbekannt'}`)
      .join('\n');
    fields.push({
      name: `Anhänge (${message.attachments.size})`,
      value: `${list}\n*(Links ggf. bereits abgelaufen — Dateien werden nicht gespiegelt)*`,
    });
  }

  if (deletedBy) fields.push({ name: '🗑️ Gelöscht von', value: deletedBy });

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: '🗑️',
    title: 'Nachricht gelöscht',
    description: lines.join('\n'),
    reason,
    fields,
    footerId: cacheNote
      ? `${message.id} · Nachrichten außerhalb des Caches werden nicht vorgehalten`
      : message.id,
  });

  await logEvent(guild, 'message', embed, { files });
};