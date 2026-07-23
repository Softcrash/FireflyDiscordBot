const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const {
  resolveExecutor,
  hasViewAuditLog,
} = require('../../utils/moderation/logging/auditResolver');
const { diffArrays } = require('../../utils/moderation/logging/logDiff');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldMember, newMember) => {
  if (oldMember.partial) return;

  const guild = newMember.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;

  const user = newMember.user;
  if (
    !shouldLog(guild.id, 'user', 'memberUpdate', {
      user,
      member: newMember,
      isBot: user?.bot ?? false,
    })
  ) {
    return;
  }

  const fields = [];
  let rolesChanged = false;
  let moderativeChange = false;

  // --- Nickname ---
  if (oldMember.nickname !== newMember.nickname) {
    moderativeChange = true;
    fields.push({
      name: '📛 Nickname',
      value: `\`${oldMember.nickname ?? '—'}\` → \`${newMember.nickname ?? '—'}\``,
    });
  }

  // --- Rollen ---
  const { added, removed } = diffArrays(
    [...oldMember.roles.cache.keys()],
    [...newMember.roles.cache.keys()]
  );
  if (added.length || removed.length) {
    rolesChanged = true;
    const parts = [];
    if (added.length) parts.push(`**+** ${added.map((id) => `<@&${id}>`).join(' ')}`);
    if (removed.length) parts.push(`**−** ${removed.map((id) => `<@&${id}>`).join(' ')}`);
    fields.push({ name: '🎭 Rollen', value: parts.join('\n') });
  }

  // --- Timeout ---
  const now = Date.now();
  const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
  const newTimeout = newMember.communicationDisabledUntilTimestamp;
  const oldActive = Boolean(oldTimeout && oldTimeout > now);
  const newActive = Boolean(newTimeout && newTimeout > now);
  if (oldActive !== newActive || (oldActive && newActive && oldTimeout !== newTimeout)) {
    moderativeChange = true;
    fields.push({
      name: '⏳ Timeout',
      value: newActive
        ? `Gesetzt bis <t:${Math.floor(newTimeout / 1000)}:f> (<t:${Math.floor(newTimeout / 1000)}:R>)`
        : 'Aufgehoben',
    });
  }

  // --- Server-Avatar ---
  if (oldMember.avatar !== newMember.avatar) {
    const oldURL = oldMember.avatar ? oldMember.displayAvatarURL() : null;
    const newURL = newMember.avatar ? newMember.avatarURL() : null;
    fields.push({
      name: '🖼️ Server-Avatar',
      value: `${oldURL ? `[Vorher](${oldURL})` : '`—`'} → ${newURL ? `[Nachher](${newURL})` : '`entfernt`'}`,
    });
  }

  // --- Boost ---
  const oldBoost = oldMember.premiumSinceTimestamp;
  const newBoost = newMember.premiumSinceTimestamp;
  if (Boolean(oldBoost) !== Boolean(newBoost)) {
    fields.push({
      name: '💎 Server-Boost',
      value: newBoost
        ? `Boostet seit <t:${Math.floor(newBoost / 1000)}:f>`
        : 'Boost beendet',
    });
  }

  if (!fields.length) return;

  // --- Ausführenden ermitteln (Rollen → MemberRoleUpdate, sonst MemberUpdate) ---
  if ((rolesChanged || moderativeChange) && hasViewAuditLog(guild)) {
    const resolved = await resolveExecutor(guild, {
      type: rolesChanged ? AuditLogEvent.MemberRoleUpdate : AuditLogEvent.MemberUpdate,
      targetId: newMember.id,
      wait: 800,
    });
    if (resolved?.executor && resolved.executor.id !== newMember.id) {
      fields.push({
        name: '👮 Geändert von',
        value: `${resolved.executor} (\`${resolved.executor.id}\`) — laut Audit-Log`,
      });
      if (resolved.reason) fields.push({ name: '📝 Grund', value: resolved.reason });
    } else if (resolved?.executor) {
      fields.push({ name: '👮 Geändert von', value: 'Selbst' });
    }
  }

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '👤',
    title: 'Mitglied aktualisiert',
    target: newMember,
    fields,
    footerId: newMember.id,
  });

  await logEvent(guild, 'user', embed);
};