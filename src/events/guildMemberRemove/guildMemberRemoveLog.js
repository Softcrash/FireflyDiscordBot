const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const {
  resolveExecutor,
  hasViewAuditLog,
} = require('../../utils/moderation/logging/auditResolver');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

function formatDuration(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days} Tage`;
  const years = Math.floor(days / 365);
  return `${years} Jahr${years === 1 ? '' : 'e'}, ${days % 365} Tage`;
}

module.exports = async (client, member) => {
  const guild = member.guild;
  if (!guild) return;
  if (member.id === client.user.id) return;
  if (!isEnabled(guild.id, 'logging')) return;

  const user = member.user ?? null;
  if (
    !shouldLog(guild.id, 'user', 'memberLeave', {
      user,
      userId: member.id,
      member: member.partial ? null : member,
      isBot: user?.bot ?? false,
    })
  ) {
    return;
  }

  // --- Kick oder Ban? (nur mit ViewAuditLog prüfbar) ---
  let kickResolved = null;
  if (hasViewAuditLog(guild)) {
    const ban = await resolveExecutor(guild, {
      type: AuditLogEvent.MemberBanAdd,
      targetId: member.id,
      wait: 1000,
    });
    if (ban) return;

    kickResolved = await resolveExecutor(guild, {
      type: AuditLogEvent.MemberKick,
      targetId: member.id,
      wait: 0,
    });
  }

  // --- Beitrittsdaten & Rollen (bei Partials ggf. nicht verfügbar) ---
  const fields = [];
  if (!member.partial && member.joinedTimestamp) {
    const joinedTs = Math.floor(member.joinedTimestamp / 1000);
    fields.push({
      name: 'Beigetreten',
      value: `<t:${joinedTs}:F>\nVerweildauer: \`${formatDuration(Date.now() - member.joinedTimestamp)}\``,
    });
  } else {
    fields.push({ name: 'Beigetreten', value: '`— nicht im Cache —`' });
  }

  const roles = member.partial
    ? null
    : member.roles?.cache?.filter((r) => r.id !== guild.id);
  if (roles?.size) {
    fields.push({
      name: `Rollen (${roles.size})`,
      value: roles.map((r) => `<@&${r.id}>`).join(' '),
    });
  }

  fields.push({ name: 'Mitglieder jetzt', value: `\`${guild.memberCount}\``, inline: true });

  const isKick = Boolean(kickResolved);
  if (isKick) {
    fields.push({
      name: '👢 Gekickt von',
      value: kickResolved.executor
        ? `${kickResolved.executor} (\`${kickResolved.executor.id}\`) — laut Audit-Log`
        : '`unbekannt`',
    });
  }

  const embed = buildLogEmbed({
    action: 'delete',
    emoji: isKick ? '👢' : '📤',
    title: isKick ? 'Mitglied gekickt' : 'Mitglied hat den Server verlassen',
    target: user ?? { name: 'Unbekannter User', id: member.id },
    reason: isKick ? kickResolved.reason : null,
    fields,
    footerId: member.id,
  });

  await logEvent(guild, 'user', embed);
};