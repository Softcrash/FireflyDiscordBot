const { PermissionsBitField } = require('discord.js');

const PERMISSION_NAMES_DE = {
  CreateInstantInvite: 'Einladung erstellen',
  KickMembers: 'Mitglieder kicken',
  BanMembers: 'Mitglieder bannen',
  Administrator: 'Administrator',
  ManageChannels: 'Kanäle verwalten',
  ManageGuild: 'Server verwalten',
  AddReactions: 'Reaktionen hinzufügen',
  ViewAuditLog: 'Audit-Log einsehen',
  PrioritySpeaker: 'Priority-Speaker',
  Stream: 'Streamen / Video',
  ViewChannel: 'Kanal ansehen',
  SendMessages: 'Nachrichten senden',
  SendTTSMessages: 'TTS-Nachrichten senden',
  ManageMessages: 'Nachrichten verwalten',
  EmbedLinks: 'Links einbetten',
  AttachFiles: 'Dateien anhängen',
  ReadMessageHistory: 'Nachrichtenverlauf lesen',
  MentionEveryone: '@everyone erwähnen',
  UseExternalEmojis: 'Externe Emojis verwenden',
  ViewGuildInsights: 'Server-Insights einsehen',
  Connect: 'Verbinden',
  Speak: 'Sprechen',
  MuteMembers: 'Mitglieder stummschalten',
  DeafenMembers: 'Mitglieder taubschalten',
  MoveMembers: 'Mitglieder verschieben',
  UseVAD: 'Sprachaktivierung nutzen',
  ChangeNickname: 'Nickname ändern',
  ManageNicknames: 'Nicknames verwalten',
  ManageRoles: 'Rollen verwalten',
  ManageWebhooks: 'Webhooks verwalten',
  ManageGuildExpressions: 'Emojis & Sticker verwalten',
  UseApplicationCommands: 'Anwendungsbefehle nutzen',
  RequestToSpeak: 'Redeanfrage stellen',
  ManageEvents: 'Events verwalten',
  ManageThreads: 'Threads verwalten',
  CreatePublicThreads: 'Öffentliche Threads erstellen',
  CreatePrivateThreads: 'Private Threads erstellen',
  UseExternalStickers: 'Externe Sticker verwenden',
  SendMessagesInThreads: 'In Threads schreiben',
  UseEmbeddedActivities: 'Aktivitäten starten',
  ModerateMembers: 'Mitglieder moderieren (Timeout)',
  ViewCreatorMonetizationAnalytics: 'Monetarisierungs-Analysen einsehen',
  UseSoundboard: 'Soundboard verwenden',
  CreateGuildExpressions: 'Emojis & Sticker erstellen',
  CreateEvents: 'Events erstellen',
  UseExternalSounds: 'Externe Sounds verwenden',
  SendVoiceMessages: 'Sprachnachrichten senden',
  SendPolls: 'Umfragen senden',
  UseExternalApps: 'Externe Apps verwenden',
};

function permName(flag) {
  return PERMISSION_NAMES_DE[flag] ?? flag;
}

function normalize(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

function code(value) {
  return `\`${String(value).replace(/`/g, 'ˋ')}\``;
}

function defaultFormat(value) {
  return normalize(value) === null ? '`—`' : code(value);
}

/**
 * Vergleicht zwei Objekte anhand einer fieldMap:
 *   { propKey: 'Deutsches Label' }
 *   { propKey: { label: 'Label', format: (v) => string } }
 * → [{ label, before, after }] — NUR geänderte Felder.
 */
function diffSimple(oldObj, newObj, fieldMap) {
  const changes = [];
  for (const [key, spec] of Object.entries(fieldMap)) {
    const label = typeof spec === 'string' ? spec : spec.label;
    const format = (typeof spec === 'object' && spec.format) || defaultFormat;
    const before = oldObj?.[key];
    const after = newObj?.[key];
    if (normalize(before) === normalize(after)) continue;
    changes.push({ label, before: format(before), after: format(after) });
  }
  return changes;
}

function toFields(changes, max = 15) {
  return changes.slice(0, max).map((c) => ({ name: c.label, value: `${c.before} → ${c.after}` }));
}

/**
 * Hinzugefügte / entfernte Permission-Flags als deutsche Namen.
 * checkAdmin bewusst aus (has(bit, false)) — verglichen werden echte Bits,
 * keine durch Administrator implizierten.
 */
function diffPermissions(oldBits, newBits) {
  const oldField = new PermissionsBitField(oldBits ?? 0n);
  const newField = new PermissionsBitField(newBits ?? 0n);
  const added = [];
  const removed = [];
  for (const [flag, bit] of Object.entries(PermissionsBitField.Flags)) {
    const had = oldField.has(bit, false);
    const has = newField.has(bit, false);
    if (!had && has) added.push(permName(flag));
    else if (had && !has) removed.push(permName(flag));
  }
  return { added, removed };
}

/**
 * Channel-Overwrite-Diff. old/new: Collection<id, PermissionOverwrites>
 * (z.B. channel.permissionOverwrites.cache).
 * → [{ id, type, changes: ['+ Recht', '- Recht', '= Recht', …] }]
 *   + = jetzt erlaubt · - = jetzt verweigert · = = jetzt neutral
 */
function diffOverwrites(oldOverwrites, newOverwrites) {
  const state = (ow, bit) => {
    if (!ow) return 'neutral';
    if (ow.allow?.has(bit, false)) return 'allow';
    if (ow.deny?.has(bit, false)) return 'deny';
    return 'neutral';
  };
  const symbol = { allow: '+', deny: '-', neutral: '=' };

  const ids = new Set([
    ...(oldOverwrites ? [...oldOverwrites.keys()] : []),
    ...(newOverwrites ? [...newOverwrites.keys()] : []),
  ]);

  const results = [];
  for (const id of ids) {
    const oldOw = oldOverwrites?.get(id) ?? null;
    const newOw = newOverwrites?.get(id) ?? null;
    const changes = [];
    for (const [flag, bit] of Object.entries(PermissionsBitField.Flags)) {
      const before = state(oldOw, bit);
      const after = state(newOw, bit);
      if (before === after) continue;
      changes.push(`${symbol[after]} ${permName(flag)}`);
    }
    if (!changes.length) continue;
    results.push({ id, type: newOw?.type ?? oldOw?.type ?? 0, changes });
  }
  return results;
}

function diffArrays(oldArr = [], newArr = []) {
  const oldSet = new Set(oldArr);
  const newSet = new Set(newArr);
  return {
    added: [...newSet].filter((v) => !oldSet.has(v)),
    removed: [...oldSet].filter((v) => !newSet.has(v)),
  };
}

module.exports = {
  diffSimple,
  toFields,
  diffPermissions,
  diffOverwrites,
  diffArrays,
  permName,
  PERMISSION_NAMES_DE,
};