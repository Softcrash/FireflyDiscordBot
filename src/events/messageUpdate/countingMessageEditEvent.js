const { EmbedBuilder } = require('discord.js');
const { CountingSetup, Counting } = require('../../database/registry');
const mConfig = require('../../messageConfig.json');

module.exports = async (client, oldMessage, newMessage) => {
  try {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;

    if (oldMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;

    const setup = await CountingSetup.findOne({ where: { guildId: newMessage.guild.id } });
    if (!setup || !setup.channelId) return;
    if (newMessage.channelId !== setup.channelId) return;

    const state = await Counting.findOne({ where: { guildId: newMessage.guild.id } });
    if (!state || !state.lastMessageId) return;

    if (newMessage.id !== state.lastMessageId) return;

    const embed = new EmbedBuilder()
      .setColor(`#${mConfig.embedColorWarning}`)
      .setDescription(
        `\`✏️\` ${newMessage.author} hat die letzte Zahl bearbeitet — sie war \`${state.currentCount}\`.`
      );

    await newMessage.channel.send({ embeds: [embed] }).catch((err) => {
      console.error('[counting] messageUpdate-Embed konnte nicht gesendet werden:', err);
    });
  } catch (err) {
    console.error('[counting] messageUpdate-Fehler:', err);
  }
};