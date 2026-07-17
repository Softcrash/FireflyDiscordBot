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
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  testMode: true,
  devOnly: false,
  category: 'moderation',
  run: async (client, interaction) => {
    const { options, channel } = interaction;
    const amount = options.getInteger("amount");
    const target = options.getUser("target");

    await interaction.deferReply(EPHEMERAL);

    try {
      const channelMessages = await channel.messages.fetch({
        limit: target ? 100 : amount,
      });

      if (channelMessages.size === 0) {
        return await interaction.editReply({
          content: "There are no messages in this channel to delete.",
        });
      }

      let messagesToDelete = [];
      if (target) {
        channelMessages.forEach((m) => {
          if (m.author.id === target.id && messagesToDelete.length < amount) {
            messagesToDelete.push(m);
          }
        });
      } else {
        messagesToDelete = [...channelMessages.values()];
      }

      let deletedCount = 0;
      if (messagesToDelete.length > 0) {
        const deleted = await channel.bulkDelete(messagesToDelete, true);
        deletedCount = deleted.size;
      }

      const multiMsg = deletedCount === 1 ? "message" : "messages";
      const description = target
        ? `\`✅\` Successfully cleared \`${deletedCount}\` ${multiMsg} from ${target} in ${channel}.`
        : `\`✅\` Successfully cleared \`${deletedCount}\` ${multiMsg} in ${channel}.`;

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