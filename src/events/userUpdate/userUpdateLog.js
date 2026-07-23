const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

module.exports = async (client, oldUser, newUser) => {
  if (oldUser.partial) return;

  const fields = [];

  if (oldUser.username !== newUser.username) {
    fields.push({
      name: '🔤 Username',
      value: `\`${oldUser.username}\` → \`${newUser.username}\``,
    });
  }

  if (oldUser.globalName !== newUser.globalName) {
    fields.push({
      name: '🪪 Anzeigename',
      value: `\`${oldUser.globalName ?? '—'}\` → \`${newUser.globalName ?? '—'}\``,
    });
  }

  if (oldUser.avatar !== newUser.avatar) {
    const oldURL = oldUser.avatar ? oldUser.avatarURL() : null;
    const newURL = newUser.avatar ? newUser.avatarURL() : null;
    fields.push({
      name: '🖼️ Avatar',
      value: `${oldURL ? `[Vorher](${oldURL})` : '`Standard`'} → ${newURL ? `[Nachher](${newURL})` : '`Standard`'}`,
    });
  }

  if (!fields.length) return;

  for (const guild of client.guilds.cache.values()) {
    if (!isEnabled(guild.id, 'logging')) continue;

    const member =
      guild.members.cache.get(newUser.id) ??
      (await guild.members.fetch(newUser.id).catch(() => null));
    if (!member) continue;

    if (
      !shouldLog(guild.id, 'user', 'userUpdate', {
        user: newUser,
        member,
        isBot: newUser.bot ?? false,
      })
    ) {
      continue;
    }

    const embed = buildLogEmbed({
      action: 'update',
      emoji: '🪪',
      title: 'Profil aktualisiert (global)',
      target: newUser,
      fields,
      footerId: newUser.id,
    });

    await logEvent(guild, 'user', embed);
  }
};