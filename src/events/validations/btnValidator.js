require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getButtons = require("../../utils/getButtons");
const { gateInteraction } = require("../../utils/plugins/pluginState");

module.exports = async (client, interaction) => {
  if (!interaction.isButton()) return;
  const buttons = getButtons();

  try {
    // Exakter Match (statische Buttons) ODER Prefix-Match (dynamische Buttons,
    // die Daten im customId tragen, z.B. `inf:del:<id>:<userId>:<page>`).
    const buttonObject = buttons.find(
      (btn) =>
        btn.customId === interaction.customId ||
        (btn.customIdPrefix && interaction.customId.startsWith(btn.customIdPrefix))
    );
    if (!buttonObject) return;

    // Plugin-Gate: getaggte Handler nur ausführen, wenn das Plugin
    // in dieser Guild aktiv ist (Handler ohne category: Fail-Open)
    if (await gateInteraction(interaction, buttonObject)) return;

    if (buttonObject.devOnly) {
      if (!developersId.includes(interaction.member.id)) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandDevOnly}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      };
    };

    if (buttonObject.testMode) {
      if (interaction.guild.id !== testServerId) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.commandTestMode}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      };
    };

    if (buttonObject.userPermissions?.length) {
      for (const permission of buttonObject.userPermissions) {
        if (interaction.member.permissions.has(permission)) {
          continue;
        };
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.userNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      };
    };

    if (buttonObject.botPermissions?.length) {
      for (const permission of buttonObject.botPermissions) {
        const bot = interaction.guild.members.me;
        if (bot.permissions.has(permission)) {
          continue;
        };
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.botNoPermissions}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      };
    };

    if (interaction.message.interaction) {
      if (interaction.message.interaction.user.id !== interaction.user.id) {
        const rEmbed = new EmbedBuilder()
          .setColor(`${mConfig.embedColorError}`)
          .setDescription(`${mConfig.cannotUseButton}`);
        interaction.reply({ embeds: [rEmbed], ephemeral: true });
        return;
      };
    };

    await buttonObject.run(client, interaction);
  } catch (err) {
    console.log(`An error occurred! ${err}`.red);
  };
};