const { buildLogEmbed } = require('../../utils/moderation/logging/logEmbed');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { shouldLog } = require('../../utils/moderation/logging/logFilter');
const { isEnabled } = require('../../utils/plugins/pluginState');

const YOUNG_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = async (client, member) => {
  const guild = member.guild;
  if (!guild) return;
  if (!isEnabled(guild.id, 'logging')) return;

  const user = member.user;
  if (
    !shouldLog(guild.id, 'user', 'memberJoin', {
      user,
      member,
      isBot: user?.bot ?? false,
    })
  ) {
    return;
  }

  const createdTs = Math.floor(user.createdTimestamp / 1000);
  const accountAge = Date.now() - user.createdTimestamp;

  const fields = [
    { name: 'Account erstellt', value: `<t:${createdTs}:F> · <t:${createdTs}:R>` },
    { name: 'Mitglieder jetzt', value: `\`${guild.memberCount}\``, inline: true },
  ];

  if (accountAge < YOUNG_ACCOUNT_MS) {
    const days = Math.max(1, Math.floor(accountAge / (24 * 60 * 60 * 1000)));
    fields.unshift({
      name: '⚠️ Junger Account',
      value: `Dieser Account ist erst **${days} Tag${days === 1 ? '' : 'e'}** alt.`,
    });
  }

  const embed = buildLogEmbed({
    action: 'create',
    emoji: '📥',
    title: user?.bot ? 'Bot hinzugefügt' : 'Mitglied beigetreten',
    target: member,
    fields,
    footerId: member.id,
  });

  await logEvent(guild, 'user', embed);
};