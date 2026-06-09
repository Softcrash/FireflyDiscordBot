const { EmbedBuilder } = require('discord.js');
const { ModerationSetup } = require('../../database/registry');

const ACTION_META = {
  ban: { color: 0xfb2f61, title: '🔨 Ban', verb: 'gebannt' },
  timeout: { color: 0xf39c12, title: '⏱️ Timeout', verb: 'getimeoutet' },
  warn: { color: 0xffcc4d, title: '⚠️ Warn', verb: 'verwarnt' },
  kick: { color: 0xe74c3c, title: '👢 Kick', verb: 'gekickt' },
};

/**
 * Listener für das custom Event `moderationAction`.
 * Wird von den Mod-Commands via `client.emit('moderationAction', payload)` gefeuert.
 *
 * Payload-Struktur:
 *   {
 *     guild,         // Guild
 *     moderator,     // GuildMember
 *     targetUser,    // User
 *     type,          // 'ban' | 'timeout' | 'warn' | 'kick'
 *     reason,        // string
 *     durationHuman, // string | null (z.B. "2 Stunden")
 *     expiresAt,     // Date | null
 *     infraction,    // Infraction-DB-Row (mit .id)
 *   }
 */
module.exports = async (client, payload) => {
  try {
    if (!payload || !payload.guild) return;

    const setup = await ModerationSetup.findOne({ where: { guildId: payload.guild.id } });
    if (!setup || !setup.enabled || !setup.modLogChannelId) return;

    const channel = await payload.guild.channels.fetch(setup.modLogChannelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) return;

    const meta = ACTION_META[payload.type] ?? { color: 0x5865f2, title: payload.type, verb: 'moderiert' };

    const fields = [
      {
        name: '👤 Target',
        value: `${payload.targetUser} (\`${payload.targetUser.tag}\`)\n\`${payload.targetUser.id}\``,
        inline: true,
      },
      {
        name: '🛡️ Moderator',
        value: `${payload.moderator} (\`${payload.moderator.user.tag}\`)`,
        inline: true,
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true,
      },
      {
        name: '📝 Grund',
        value: payload.reason ? `\`\`\`${payload.reason}\`\`\`` : '_Kein Grund angegeben._',
        inline: false,
      },
    ];

    if (payload.durationHuman) {
      fields.push({ name: '⏱️ Dauer', value: payload.durationHuman, inline: true });
    }
    if (payload.expiresAt) {
      fields.push({
        name: '📅 Endet',
        value: `<t:${Math.floor(payload.expiresAt.getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${meta.title} — User wurde ${meta.verb}`)
      .setColor(meta.color)
      .setThumbnail(payload.targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(fields)
      .setFooter({
        text: payload.infraction?.id
          ? `Infraction #${payload.infraction.id} • ${payload.guild.name}`
          : payload.guild.name,
        iconURL: payload.guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch((err) => {
      console.error('[modLogger] Embed konnte nicht gesendet werden:', err);
    });
  } catch (err) {
    console.error('[modLogger] Fehler:', err);
  }
};