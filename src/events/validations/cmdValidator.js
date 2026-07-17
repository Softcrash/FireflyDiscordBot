// FILE: src/events/validations/cmdValidator.js
require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getLocalCommands = require("../../utils/getLocalCommands");
const { gateInteraction } = require("../../utils/plugins/pluginState");
//const userPremiumSchema = require("../../schemas/userpremium");

module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const localCommands = getLocalCommands();

  try {
    const commandObject = localCommands.find(
      (cmd) => cmd.data.name === interaction.commandName
    );
    if (!commandObject) return;

    // Plugin-Gate: getaggte Handler nur ausführen, wenn das Plugin
    // in dieser Guild aktiv ist (Handler ohne category: Fail-Open)
    if (await gateInteraction(interaction, commandObject)) return;

    if (commandObject.devOnly) {
      if (!developersId.includes(interaction.member.id)) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandDevOnly}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    /*if (commandObject.premiumOnly) {
      const userData = await userPremiumSchema.findOne({
        UserID: interaction.user.id,
      });
      if (!userData) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandPremiumOnly}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }*/

    if (commandObject.testMode) {
      if (interaction.guild.id !== testServerId) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandTestMode}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    if (commandObject.userPermissions?.length) {
      for (const permission of commandObject.userPermissions) {
        if (interaction.member.permissions.has(permission)) {
          continue;
        }
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.userNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    if (commandObject.botPermissions?.length) {
      for (const permission of commandObject.botPermissions) {
        const bot = interaction.guild.members.me;
        if (bot.permissions.has(permission)) {
          continue;
        }
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.botNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      }
    }

    await commandObject.run(client, interaction);
  } catch (err) {
    console.log(
      `An error occurred while validating chat input commands! ${err}`.red
    );
    console.log(err);
  }
};