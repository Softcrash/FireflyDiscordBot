const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

const REGELN_TEIL_1 = `**1.** __Respektvoller Umgang mit den Usern.__
Hier auf dem Firefly-Server ist eine freundliche und angenehme Atmosphäre stets zu pflegen. Hass, Hetze, Negative Gedanken oder sonstige negative Einflüsse sind in keinem Chat gestattet.

**1.1.** __Private Angelegenheiten auf dem Server.__
Solltet ihr Probleme mit einem User:in haben so klärt dies bitte im privaten Kreise. Der Server sowie die Chats auf diesem Server dienen nicht zur Diskussion privater Themen sondern lediglich zur Unterhaltung mit anderen User:in.

**1.2.** __Politikthemen.__
Auf dem Firefly-Server gelten die juristischen Regeln der Bundesrepublik Deutschland. Nichtsdestotrotz beharren wir darauf dass politische Äußerungen in keinster Weise schriftlich zu äußern sind. Sofern ihr dennoch über Politik reden wollt, geht in einen Voice-Channel oder in einen privaten Diskurs. Des Weiteren werden Äußerungen die gegen die demokratische Grundverordnung sowie gegen die Verfassung der Bundesrepublik Deutschland getätigt werden gelöscht und hart sanktioniert.

**2.** __Belästigungen__
Jegliche Art der Belästigung ist strikt verboten und wird je nach Härte sanktioniert. Dazu zählt vor allem auch das DM-Sliden bei Personen die bereits klar gemacht haben dass sie keine Nachrichten ö.Ä möchten.

**2.1.** __Mobbing__
Das gezielte runterziehen/runtermachen einer Person zur Bespaßung eines Selbst oder anderen Menschen wird hier nicht toleriert. Es gilt jeden Menschen gleich zu behandeln.

**3.** __Artikulation__
Die Wortwahl hier auf Firefly-Paradise ist stets SFW und ohne Beleidigungen oder sonstiges zu pflegen. Ausschließlich kleine Neckereien unter Freunden sind erlaubt, sofern sie kein Deutungsspielraum zu potentiell anderen Personen bieten.

**3.1.** __Extremsituationen__
Bei Aussagen die unter die Gürtellinie oder in die persönliche Ebene gehen sehen wir uns starke Konsequenzen gegenüber der Person zu verhängen, die diese Aussage getätigt hat. Dabei spielen Hintergrund und Motiv keine Rolle. Wir erwarten von unseren Usern sich egal in welcher Situation zumindest ausreichend am Riemen zu reißen, sodass solche Aussagen nicht geschrieben werden.

**4.** __Verhaltensweise im Chat.__
Es wird stets darauf geachtet den Chatfluss nicht zu stören sondern dem Chatfluss beizutreten.
Das Spammen von Buchstaben, Wörtern, Zahlen ö.Ä ist nicht gestattet.

**4.1.** __Sensible Themen.__
Themen die potentielle Traumata oder Triggerpunkte auslösen können sind nicht gestattet. Diese werden auch direkt unterbunden, da wir eine vertrauliche Atmosphäre für alle schaffen wollen und solche Themen diese Atmosphäre stören.

**4.2.** __Medien/GIFs__
Das Benutzen von GIFs ist perse gestattet. Dafür braucht man jedoch die pic perms Rolle. Medien wie Videos Bilder o.Ä werden in den jeweiligen Kanälen reingeschickt. Medien, die fehlerhaft in Kanäle versendet wurden werden gelöscht.

**4.3.** __NSFW__
Inhalte die gegen das Jugendschutzgesetz verstoßen werden hier ebenso wenig toleriert. Firefly-Paradise ist und bleibt ein SFW-Server

**4.4.** __Werbung__
Jegliche Inhalte, dessen Intention es ist für eine bestimmte Sache zu werben, sind verboten. User:innen, die aufgrund von Nitro die Möglichkeit haben, ein serverspezifisches Profil anzulegen, sind dazu verpflichtet, dieses Profil so zu gestalten, sodass keine Art der Werbung zu sehen ist.`;

const REGELN_TEIL_2 = `**5.** __Persönliche Informationen__
Das Herausgeben privater/vertraulicher Informationen an Dritte ist verboten. Sollte es dennoch vorkommen so werden harte Sanktionen folgen

**6.** __Anweisungen von Teammitgliedern__
Den Anweisungen von Teamlern ist stets Folge zu leisten. Bei Meinungsverschiedenheit werden diese NICHT im Main-Chat sondern in einem Ticket ausdiskutiert.

**6.1.** __Respektlosigkeit gegenüber Teammitgliedern__
Bei wiederholtem ignorieren/diskutieren gegen eine Entscheidung eines Teammitgliedes sehen wir vor, härtere Strafen zu verteilen.

**7.** __Unwissenheit__
Unwissenheit schützt nicht vor Strafe. Jeder Account, der hier auf Firefly-Paradise ist ist in der Pflicht die Regeln zu akzeptieren und sich an diese auch zu halten.

**8.** __Regeländerungen.__
Der Highteam des Firefly Paradise Servers kann jederzeit Regeln hinzufügen/abändern oder entfernen. Diese Regeländerungen werden jedoch in #breaking-news angekündigt.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-builder')
    .setDescription('Sendet das Regelwerk in diesen Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  devOnly: true,
  run: async (client, interaction) => {
    const regelnTeil1 = new EmbedBuilder()
      .setTitle('<a:2c_butterfly:1510198875116539989> Dreamy Garden – Regeln')
      .setDescription(REGELN_TEIL_1)
      .setColor(0x5865f2);

    const regelnTeil2 = new EmbedBuilder()
      .setDescription(REGELN_TEIL_2)
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.channel.send({
      embeds: [regelnTeil1, regelnTeil2],
      allowedMentions: { parse: [] },
    });

    await interaction.reply({ content: '✅ Regelwerk wurde gesendet.', ...EPHEMERAL });
  },
};