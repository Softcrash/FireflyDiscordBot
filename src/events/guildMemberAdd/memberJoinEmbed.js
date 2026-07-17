const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const mConfig = require('../../messageConfig.json');

const WELCOME_CHANNEL_ID = '1491382345327054955';
const BANNER_PATH = path.join(__dirname, '..', '..', 'assets', 'memberEventBanner.jpg');
const BANNER_NAME = 'memberEventBanner.jpg';
const EMBED_COLOR = mConfig.embedColorSuccess;

const TITLE       = 'Next Station -  Tokyo.ᐟ';
const DESCRIPTION = 'Willkommen neuer Reisender, erkunde die Stadt <3';
const FOOTER      = '<3';
// ==================

module.exports = async (client, member) => {
  if (member.user.bot) return;

  const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const banner = new AttachmentBuilder(BANNER_PATH, { name: BANNER_NAME });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
    .setTitle(TITLE)
    .setDescription(DESCRIPTION)
    .setImage(`attachment://${BANNER_NAME}`)
    .setFooter({ text: FOOTER });

  try {
    await channel.send({
      content: `welcome ${member}!`,
      embeds: [embed],
      files: [banner],
      allowedMentions: { users: [member.id] }, // pingt nur den neuen User
    });
  } catch (err) {
    console.error('[memberJoinEmbed] Nachricht konnte nicht gesendet werden:', err);
  }
};