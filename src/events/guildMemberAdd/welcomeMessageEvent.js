const {
  AttachmentBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MessageFlags,
  ContainerBuilder,
} = require('discord.js');
const path = require('node:path');

// ===== HARDCODED CONFIG =====
const WELCOME_CHANNEL_ID     = '1491382345327054951'; // <- Channel in den die Willkommensnachricht geht
const SELFROLES_CHANNEL_ID   = '1500163682489991208'; // <- #selfroles
const VORSTELLUNG_CHANNEL_ID = '1491382345327054957'; // <- #vorstellung
const TICKET_CHANNEL_ID      = '1491460923435647157'; // <- #Ticket

// Fixed Thumbnail aus dem assets-Ordner — passe den Dateinamen ggf. an
const THUMBNAIL_PATH = path.join(__dirname, '..', '..', 'assets', 'welcome-thumbnail.jpg');
const THUMBNAIL_NAME = 'welcome-thumbnail.jpg';

const COOLDOWN_MS   = 60 * 1000;          // 1 Minute — Timer wird bei jedem Join zurückgesetzt
const HAMTARO_EMOJI = '<:56566hamtarofairy:1507023038745415881>';
const CLOUDS_EMOJI  = '<a:FFY_CloudsWhite:1510198963192598601> ';
const ACCENT_COLOR  = 0xffffff; 
// ============================

// Pro Guild ein eigener Buffer: { members: GuildMember[], timer: Timeout }
const pendingWelcomes = new Map();

/**
 * Baut eine schöne deutsche Aufzählung der Mentions:
 *  1 User  → "@A"
 *  2 User  → "@A und @B"
 *  3+ User → "@A, @B und @C"
 */
function formatMembers(members) {
  if (members.length === 1) return `${members[0]}`;
  if (members.length === 2) return `${members[0]} und ${members[1]}`;
  const head = members.slice(0, -1).map(m => `${m}`).join(', ');
  const tail = members[members.length - 1];
  return `${head} und ${tail}`;
}

function buildSingleUserText(member) {
  return (
    `𐙚 Willkommen in Tokyo .ᐟ ${member} 𐙚\n\n` +
    `Schön, dass du den Weg zu uns gefunden hast.\n` +
    `Schau dich gern in <#${SELFROLES_CHANNEL_ID}> um, damit du dich im Server einfinden kannst.\n\n` +
    `Wenn du magst, kannst du dich in <#${VORSTELLUNG_CHANNEL_ID}> ein wenig vorstellen — das ist natürlich kein Muss.\n\n` +
    `Wir wünschen dir einen wundervollen\n` + 
    `Aufenthalt!\n\n` +
    `Solltest du einer unserer ruhigen user sein dann mach doch gerne ein <#${TICKET_CHANNEL_ID}> auf und\n` +
    `bewirb dich für **Dreamy Garden** und komm entspannt und voller Ruhe an ${CLOUDS_EMOJI}`
  );
}

function buildMultiUserText(members) {
  return (
    `𐙚 Willkommen in Tokyo .ᐟ 𐙚\n` +
    `${formatMembers(members)}\n\n` +
    `Schön, dass ihr den Weg zu uns gefunden habt.\n` +
    `Schaut euch gerne in <#${SELFROLES_CHANNEL_ID}> um, damit ihr euch im Server einfinden könnt.\n\n` +
    `Wenn ihr mögt, könnt ihr euch auch in <#${VORSTELLUNG_CHANNEL_ID}> ein wenig vorstellen — das ist natürlich kein Muss.\n\n` +
    `Wir wünschen euch einen wundervollen\n` +
    `Aufenthalt!\n\n` +
    `Solltet ihr einer unserer ruhigen user sein dann macht doch gerne ein <#${TICKET_CHANNEL_ID}> auf und\n` +
    `bewirbt euch für Dreamy Garden und kommt entspannt und voller Ruhe an ${CLOUDS_EMOJI}`
  );
}

/**
 * Wird nach Ablauf des Cooldowns ausgeführt — sendet die gesammelten Welcomes.
 */
async function flushWelcome(guild) {
  const pending = pendingWelcomes.get(guild.id);
  if (!pending) return;
  pendingWelcomes.delete(guild.id);

  if (pending.members.length === 0) return;

  //welcome channel finden
  const channel = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) {
    console.error(`[welcome] Welcome-Channel ${WELCOME_CHANNEL_ID} nicht gefunden oder kein Text-Channel`);
    return;
  }

  //prüfung ob singel oder multi msg
  const isSingle = pending.members.length === 1;
  const text = isSingle
    ? buildSingleUserText(pending.members[0])
    : buildMultiUserText(pending.members);

  // welcome builder
  const attachment = new AttachmentBuilder(THUMBNAIL_PATH, { name: THUMBNAIL_NAME });
  const textDisplay = new TextDisplayBuilder().setContent(text);
  const thumbnail   = new ThumbnailBuilder().setURL(`attachment://${THUMBNAIL_NAME}`);

  const section = new SectionBuilder()
      .addTextDisplayComponents(textDisplay)
      .setThumbnailAccessory(thumbnail);

  const welcomeContainer = new ContainerBuilder()
      .setAccentColor(ACCENT_COLOR)
      .addSectionComponents(section);

  // message senden
  try {
    await channel.send({
      components: [welcomeContainer],
      files: [attachment],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: pending.members.map(m => m.id) },
    });
  } catch (err) {
    console.error('[welcome] Nachricht konnte nicht gesendet werden:', err);
  }
}

module.exports = async (client, member) => {
  if (member.user.bot) return;

  const guildId = member.guild.id;
  let pending = pendingWelcomes.get(guildId);

  if (!pending) {
    pending = { members: [], timer: null };
    pendingWelcomes.set(guildId, pending);
  }

  pending.members.push(member);

  // Timer immer zurücksetzen — Nachricht wird erst gesendet, wenn 1 Minute
  // lang niemand neues mehr joined.
  if (pending.timer) clearTimeout(pending.timer);
  pending.timer = setTimeout(() => {
    flushWelcome(member.guild).catch(err =>
      console.error('[welcome] flushWelcome-Fehler:', err)
    );
  }, COOLDOWN_MS);
};