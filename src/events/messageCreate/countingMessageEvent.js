const { EmbedBuilder } = require('discord.js');
const { CountingSetup, Counting } = require('../../database/registry');
const mConfig = require('../../messageConfig.json');

const NUMBER_REGEX = /^\d+$/;

/**
 * Behandelt einen Fehlversuch: Reset, ❌-Reaktion, Embed senden.
 */
async function handleFail(message, state, reason) {
  const lastValid = state.currentCount;

  state.currentCount = 0;
  state.lastUserId = null;
  state.lastMessageId = null;
  await state.save();

  await message.react('❌').catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(`#${mConfig.embedColorError}`)
    .setTitle('💥 Die Kette ist gerissen!')
    .setDescription(
      [
        `${message.author} hat die Kette bei \`${lastValid}\` zerbrochen.`,
        ``,
        `**Grund:** ${reason}`,
        `**Highscore:** \`${state.highScore}\``,
        ``,
        `🔄 Die nächste Zahl ist wieder \`1\`.`,
      ].join('\n')
    );

  await message.channel.send({ embeds: [embed] }).catch((err) => {
    console.error('[counting] Fail-Embed konnte nicht gesendet werden:', err);
  });
}

async function handleSuccess(message, state, number) {
  state.currentCount = number;
  state.lastUserId = message.author.id;
  state.lastMessageId = message.id;
  if (number > state.highScore) state.highScore = number;
  await state.save();

  await message.react('✅').catch(() => {});
}

module.exports = async (client, message) => {
  try {
    if (message.author?.bot) return;
    if (!message.guild) return;

    const setup = await CountingSetup.findOne({ where: { guildId: message.guild.id } });
    if (!setup) return;
    if (!setup.channelId || !setup.enabled) return;
    if (message.channel.id !== setup.channelId) return;

    const content = message.content?.trim() ?? '';
    if (!NUMBER_REGEX.test(content)) return;

    const number = parseInt(content, 10);

    const [state] = await Counting.findOrCreate({
      where: { guildId: message.guild.id },
      defaults: { guildId: message.guild.id },
    });

    const expected = state.currentCount + 1;

    if (state.lastUserId === message.author.id) {
      return handleFail(message, state, 'Du kannst nicht zweimal hintereinander zählen.');
    }

    if (number !== expected) {
      return handleFail(
        message,
        state,
        `Falsche Zahl — erwartet war \`${expected}\`, gesendet wurde \`${number}\`.`
      );
    }

    return handleSuccess(message, state, number);
  } catch (err) {
    console.error('[counting] messageCreate-Fehler:', err);
  }
};