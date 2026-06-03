const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const path = require('node:path');
const { REACTION_ROLES, MENUS } = require('../../utils/reaktionRoles/boosterRolesConfig');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };
const BANNER_PATH = path.join(__dirname, '..', '..', 'assets', 'boost-banner.png');
const BANNER_NAME = 'boost-banner.png';

/**
 * Baut ein Select-Menu für einen bestimmten Menu-Index
 * @param {number} menuIndex - 1 oder 2
 * @param {Array} roles - Rollen die zu diesem Menü gehören
 * @returns {ActionRowBuilder|null} Null wenn keine Rollen vorhanden
 */
function buildSelectMenu(menuIndex, roles) {
  if (roles.length === 0) return null;

  const menuConfig = MENUS?.[menuIndex] ?? {};
  const placeholder = menuConfig.placeholder ?? `Wähle deine Rolle (Menü ${menuIndex})...`;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`boost_role_select_${menuIndex}`)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      roles.map(r => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(r.label)
          .setValue(r.roleId)
          .setEmoji(r.emojiId ?? r.emoji);
        if (r.description) option.setDescription(r.description);
        return option;
      }),
    );

  return new ActionRowBuilder().addComponents(selectMenu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boost-setup')
    .setDescription('Sendet das Boost-Reward-Panel in diesen Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  devOnly: true,
  run: async (client, interaction) => {
    const banner = new AttachmentBuilder(BANNER_PATH, { name: BANNER_NAME });

    // Rollen nach Menü gruppieren (default = Menü 1 falls nicht gesetzt)
    const menu1Roles = REACTION_ROLES.filter(r => (r.menu ?? 1) === 1);
    const menu2Roles = REACTION_ROLES.filter(r => r.menu === 2);

    // Embed-Description gruppiert nach Menü aufbauen
    const descriptionParts = [];
    if (menu1Roles.length > 0) {
      const title1 = MENUS?.[1]?.title ?? 'Menü 1';
      descriptionParts.push(
        `**${title1}**\n` + menu1Roles.map(r => `${r.emoji} — <@&${r.roleId}>`).join('\n'),
      );
    }
    if (menu2Roles.length > 0) {
      const title2 = MENUS?.[2]?.title ?? 'Menü 2';
      descriptionParts.push(
        `**${title2}**\n` + menu2Roles.map(r => `${r.emoji} — <@&${r.roleId}>`).join('\n'),
      );
    }

    const embed = new EmbedBuilder()
      .setTitle('🚀 Vielen dank für eure Unterstützung, als Belohnung dürft ihr euch eine Rolle aussuchen')
      .setDescription(descriptionParts.join('\n\n'))
      .setColor(0xf47fff)
      .setImage(`attachment://${BANNER_NAME}`)
      .setFooter({ text: 'Boost Rewards' })
      .setTimestamp();

    // Select-Menus bauen (nur wenn Rollen vorhanden)
    const components = [];
    const row1 = buildSelectMenu(1, menu1Roles);
    const row2 = buildSelectMenu(2, menu2Roles);
    if (row1) components.push(row1);
    if (row2) components.push(row2);

    try {
      await interaction.channel.send({
        embeds: [embed],
        components,
        files: [banner],
      });
    } catch (err) {
      console.error('[boost-setup] Konnte Panel nicht senden:', err);
      return interaction.reply({
        content: '❌ Konnte das Panel nicht senden. Habe ich Rechte im Channel, und liegt das Bild unter `assets/boost-banner.png`?',
        ...EPHEMERAL,
      });
    }

    await interaction.reply({ content: '✅ Boost-Panel wurde gesendet.', ...EPHEMERAL });
  },
};