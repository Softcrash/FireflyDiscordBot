const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const mConfig = require("../../messageConfig.json");

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Deletes a specific number of messages provided.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of messages to delete from the channel.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription(
          "Messages to be deleted from a specific user in a channel."
        )
    ),
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  testMode: false,

  run: async (client, interaction) => {
    const { options, channel } = interaction;
    let amount = options.getInteger("amount");
    const target = options.getUser("target");
    const multiMsg = amount === 1 ? "message" : "messages";

    await interaction.deferReply(EPHEMERAL);

    try {
      const channelMessages = await channel.messages.fetch();

      if (channelMessages.size === 0) {
        return await interaction.editReply({
          content: "There are no messages in this channel to delete.",
        });
      }

      if (amount > channelMessages.size) amount = channelMessages.size;

      let messagesToDelete = [];

      if (target) {
        channelMessages.forEach((m) => {
          if (m.author.id === target.id && messagesToDelete.length < amount) {
            messagesToDelete.push(m);
          }
        });
      } else {
        messagesToDelete = channelMessages.first(amount);
      }

      if (messagesToDelete.length > 0) {
        await channel.bulkDelete(messagesToDelete, true);
      }

      const description = target
        ? `\`✅\` Successfully cleared \`${messagesToDelete.length}\` ${multiMsg} from ${target} in ${channel}.`
        : `\`✅\` Successfully cleared \`${messagesToDelete.length}\` ${multiMsg} in ${channel}.`;

      const clearEmbed = new EmbedBuilder()
        .setColor(mConfig.embedColorSuccess)
        .setDescription(description);

      await interaction.editReply({ embeds: [clearEmbed] });
    } catch (error) {
      await interaction.editReply({
        content: "An error occurred while clearing the messages.",
      });
    }
  },
};