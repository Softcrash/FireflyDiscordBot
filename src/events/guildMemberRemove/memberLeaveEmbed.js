const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const mConfig = require('../../messageConfig.json');

// ===== CONFIG =====
const LEAVE_CHANNEL_ID = '1491401716283740332';
const BANNER_PATH = path.join(__dirname, '..', '..', 'assets', 'memberEventBanner.jpg');
const BANNER_NAME = 'memberEventBanner.jpg';
const EMBED_COLOR = mConfig.embedColorSuccess;

const TITLE = 'Lebe Wohl :(';
const DESCRIPTION = (mention) =>
  `${mention} hat leider Tokyo.ᐟ verlassen. 💢`;
// ==================

module.exports = async (client, member) => {
  if (member.user?.bot) return;

  const channel = await member.guild.channels.fetch(LEAVE_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const banner = new AttachmentBuilder(BANNER_PATH, { name: BANNER_NAME });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(TITLE)
    .setDescription(DESCRIPTION(`<@${member.id}>`))
    .setImage(`attachment://${BANNER_NAME}`);

  try {
    await channel.send({
      embeds: [embed],
      files: [banner],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('[memberLeaveEmbed] Nachricht konnte nicht gesendet werden:', err);
  }
};