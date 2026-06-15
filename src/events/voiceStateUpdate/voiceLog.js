const { EmbedBuilder } = require('discord.js');
const { logEvent } = require('../../utils/moderation/logging/logManager');
const { COLORS } = require('../../utils/moderation/logging/logConstants');

module.exports = async (client, oldState, newState) => {
  const guild = newState.guild ?? oldState.guild;
  const member = newState.member ?? oldState.member;
  if (!guild || !member) return;

  const lines = [];
  let color = COLORS.voice;
  let title = '🎙️ Voice-Update';

  // Channel: Join / Leave / Wechsel
  if (!oldState.channelId && newState.channelId) {
    title = '🔊 Voice beigetreten';
    color = COLORS.create;
    lines.push(`Kanal: <#${newState.channelId}>`);
  } else if (oldState.channelId && !newState.channelId) {
    title = '🔇 Voice verlassen';
    color = COLORS.delete;
    lines.push(`Kanal: <#${oldState.channelId}>`);
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    title = '↔️ Voice-Kanal gewechselt';
    color = COLORS.update;
    lines.push(`Von <#${oldState.channelId}> → <#${newState.channelId}>`);
  }

  // Status-Änderungen
  if (oldState.serverMute !== newState.serverMute)
    lines.push(newState.serverMute ? '🔇 Server-stummgeschaltet' : '🔊 Server-Stummschaltung aufgehoben');
  if (oldState.serverDeaf !== newState.serverDeaf)
    lines.push(newState.serverDeaf ? '🔕 Server-getaubt' : '🔔 Server-Taubheit aufgehoben');
  if (oldState.selfMute !== newState.selfMute)
    lines.push(newState.selfMute ? '🎤❌ Selbst stummgeschaltet' : '🎤 Selbst-Stummschaltung aufgehoben');
  if (oldState.selfDeaf !== newState.selfDeaf)
    lines.push(newState.selfDeaf ? '🎧❌ Selbst getaubt' : '🎧 Selbst-Taubheit aufgehoben');
  if (oldState.streaming !== newState.streaming)
    lines.push(newState.streaming ? '🖥️ Stream gestartet' : '🖥️ Stream beendet');
  if (oldState.selfVideo !== newState.selfVideo)
    lines.push(newState.selfVideo ? '📹 Kamera an' : '📹 Kamera aus');

  if (!lines.length) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: member.user.username, iconURL: member.displayAvatarURL() })
    .setTitle(title)
    .setDescription(`${member} (\`${member.id}\`)\n\n${lines.join('\n')}`)
    .setFooter({ text: `User-ID: ${member.id}` })
    .setTimestamp();

  await logEvent(guild, 'voice', embed, {
    username: member.user.username,
    avatarURL: member.displayAvatarURL(),
  });
};