const { EmbedBuilder } = require('discord.js');
const { CountingSetup, Counting } = require('../../database/registry');
const mConfig = require('../../messageConfig.json');

module.exports = async (client, message) => {
  try {
    if (!message.guild) return;
    if (message.author?.bot) return;

    const setup = await CountingSetup.findOne({ where: { guildId: message.guild.id } });
    if (!setup || !setup.channelId) return;
    if (message.channelId !== setup.channelId) return;

    const state = await Counting.findOne({ where: { guildId: message.guild.id } });
    if (!state || !state.lastMessageId) return;

    // Wir reagieren NUR, wenn die letzte gültige Count-Nachricht gelöscht wurde
    if (message.id !== state.lastMessageId) return;

    const authorMention = message.author ? `${message.author}` : 'Jemand';

    const embed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorWarning}`)
      .setDescription(
        `\`🗑️\` ${authorMention} hat die letzte Zahl gelöscht — sie war \`${state.currentCount}\`. ` +
        `Macht einfach mit \`${state.currentCount + 1}\` weiter.`
      );

    await message.channel.send({ embeds: [embed] }).catch((err) => {
      console.error('[counting] messageDelete-Embed konnte nicht gesendet werden:', err);
    });
  } catch (err) {
    console.error('[counting] messageDelete-Fehler:', err);
  }
};