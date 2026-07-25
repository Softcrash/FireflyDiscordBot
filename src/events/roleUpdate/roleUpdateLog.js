const { AuditLogEvent } = require('discord.js');
const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { diffSimple, toFields, diffPermissions } = require('../../utils/moderation/logging/logDiff');
const { executorInfo, skipBotExecutor } = require('../../utils/moderation/logging/serverLogHelpers');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const FIELD_MAP = {
  name: 'Name',
  hexColor: { label: 'Farbe' },
  hoist: { label: 'Separat anzeigen', format: (v) => (v ? '`Ja`' : '`Nein`') },
  mentionable: { label: 'Erwähnbar', format: (v) => (v ? '`Ja`' : '`Nein`') },
};

module.exports = async (client, oldRole, newRole) => {
  const guild = newRole.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;
  if (!shouldLog(guild.id, 'server', 'roleUpdate', {})) return;

  const simple = diffSimple(oldRole, newRole, FIELD_MAP);
  const { added, removed } = diffPermissions(oldRole.permissions.bitfield, newRole.permissions.bitfield);
  if (!simple.length && !added.length && !removed.length) return;

  const info = await executorInfo(guild, {
    types: AuditLogEvent.RoleUpdate,
    targetId: newRole.id,
    label: '👮 Geändert von',
  });
  if (skipBotExecutor(guild.id, info.executor)) return;

  const fields = toFields(simple);
  if (added.length) fields.push({ name: '✅ Rechte hinzugefügt', value: added.join(', ') });
  if (removed.length) fields.push({ name: '⛔ Rechte entfernt', value: removed.join(', ') });
  fields.push(...info.fields);

  const embed = buildLogEmbed({
    action: 'update',
    emoji: '🏷️',
    title: 'Rolle geändert',
    target: newRole,
    reason: info.reason,
    fields,
    footerId: newRole.id,
  });
  await logEvent(guild, 'server', embed);
};