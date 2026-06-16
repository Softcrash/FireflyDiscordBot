// ============================================================
//  backfill.js  —  Einmaliges Nachrichten-Backfill-Script
//  Ausführen mit: node backfill.js
//
//  Liest die komplette Message-History aller Text-Kanäle und
//  schreibt die Daten in die message_stats-Tabelle.
//  Voice-Stats können nicht rückwirkend befüllt werden
//  (Discord speichert keine Voice-Join/Leave-History).
// ============================================================

require('dotenv/config');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const { sequelize } = require('./src/database/registry');
const MessageStat = require('./src/database/models/messageStatModel');

// ── Konfiguration ─────────────────────────────────────────────────────────────

// Wie viele Nachrichten pro API-Request geholt werden (max. 100)
const BATCH_SIZE = 100;

// Pause zwischen Batches in ms (verhindert Rate-Limits)
const BATCH_DELAY_MS = 500;

// Pause zwischen Kanälen in ms
const CHANNEL_DELAY_MS = 1000;

// Welche Guild-ID backfillt werden soll (aus .env oder hardcoded)
const GUILD_ID = process.env.GUILD_ID || 'DEINE_GUILD_ID_HIER';

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDateOnly(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Schreibt einen Batch von Nachrichten in die DB.
 * Nutzt findOrCreate + increment um bestehende Einträge nicht zu überschreiben
 * (falls das Script mehrfach läuft).
 */
async function flushBatch(batch) {
  // batch: Array von { guildId, userId, channelId, date }
  // Zählen wie oft jede Kombination vorkommt
  const counts = new Map();
  for (const entry of batch) {
    const key = `${entry.guildId}|${entry.userId}|${entry.channelId}|${entry.date}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of counts) {
    const [guildId, userId, channelId, date] = key.split('|');
    const [row, created] = await MessageStat.findOrCreate({
      where: { guildId, userId, channelId, date },
      defaults: { count },
    });
    if (!created) {
      row.count += count;
      await row.save();
    }
  }
}

/**
 * Liest die komplette History eines Kanals und schreibt sie in die DB.
 */
async function backfillChannel(channel, guildId) {
  let lastId = null;
  let totalProcessed = 0;
  let batch = [];

  process.stdout.write(`  [${channel.name}] wird gelesen... `);

  while (true) {
    const options = { limit: BATCH_SIZE };
    if (lastId) options.before = lastId;

    let messages;
    try {
      messages = await channel.messages.fetch(options);
    } catch (err) {
      // Kein Zugriff auf diesen Kanal → überspringen
      console.log(`\n  ⚠️  Kein Zugriff auf #${channel.name} — übersprungen`);
      return 0;
    }

    if (messages.size === 0) break;

    for (const msg of messages.values()) {
      // Bots ignorieren
      if (msg.author.bot) continue;

      batch.push({
        guildId,
        userId: msg.author.id,
        channelId: channel.id,
        date: toDateOnly(msg.createdTimestamp),
      });
    }

    // Batch in DB schreiben wenn groß genug
    if (batch.length >= 500) {
      await flushBatch(batch);
      batch = [];
    }

    totalProcessed += messages.size;
    lastId = messages.last().id;

    process.stdout.write(`\r  [${channel.name}] ${totalProcessed} Nachrichten gelesen...`);

    await sleep(BATCH_DELAY_MS);
  }

  // Restliche Nachrichten schreiben
  if (batch.length > 0) {
    await flushBatch(batch);
  }

  console.log(`\r  ✅ #${channel.name}: ${totalProcessed} Nachrichten verarbeitet`);
  return totalProcessed;
}

// ── Haupt-Funktion ────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  FireflyBot — Message-Stats Backfill');
  console.log('='.repeat(60));

  // DB verbinden + Tabellen anlegen
  console.log('\n📦 Verbinde mit Datenbank...');
  await sequelize.authenticate();
  await sequelize.sync();
  console.log('✅ Datenbank verbunden\n');

  // Discord-Client starten (nur lesen, keine Gateway-Events nötig)
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await client.login(process.env.TOKEN);
  console.log(`🤖 Bot eingeloggt als: ${client.user.tag}\n`);

  // Guild holen
  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) {
    console.error(`❌ Guild ${GUILD_ID} nicht gefunden! Prüfe GUILD_ID in .env oder im Script.`);
    process.exit(1);
  }
  await guild.fetch();
  console.log(`🏠 Guild: ${guild.name} (${guild.id})`);

  // Alle Channels fetchen
  const channels = await guild.channels.fetch();
  const textChannels = channels.filter(
    (ch) =>
      ch &&
      (ch.type === ChannelType.GuildText ||
        ch.type === ChannelType.GuildAnnouncement) &&
      ch.viewable
  );

  console.log(`📢 ${textChannels.size} Text-Kanäle gefunden\n`);
  console.log('─'.repeat(60));

  let totalMessages = 0;
  let channelCount = 0;

  for (const channel of textChannels.values()) {
    channelCount++;
    console.log(`\n[${channelCount}/${textChannels.size}] #${channel.name}`);
    const count = await backfillChannel(channel, guild.id);
    totalMessages += count;
    await sleep(CHANNEL_DELAY_MS);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Backfill abgeschlossen!`);
  console.log(`   Kanäle verarbeitet: ${channelCount}`);
  console.log(`   Nachrichten total:  ${totalMessages.toLocaleString('de')}`);
  console.log('='.repeat(60));

  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fehler:', err);
  process.exit(1);
});