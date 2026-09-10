import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChatInputCommandInteraction 
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '../../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 3 crans en arrière car on est dans : src/commands/admin/
const warnsFilePath = path.join(__dirname, '..', '..', '..', 'data', 'warns.json');

interface Warn {
  id: string;
  moderator: string;
  reason: string;
  date: number;
}

function getWarns(): Record<string, Record<string, Warn[]>> {
  if (!fs.existsSync(warnsFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(warnsFilePath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveWarns(data: Record<string, Record<string, Warn[]>>) {
  const dir = path.dirname(warnsFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(warnsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Gestion des avertissements')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Ajouter un avertissement')
        .addUserOption(o => o.setName('membre').setDescription('Membre à avertir').setRequired(true))
        .addStringOption(o => 
          o.setName('raison')
            .setDescription('Sélectionne une raison prédéfinie')
            .setRequired(true)
            .addChoices(
              { name: '💬 Spam / Flood répété', value: 'Spam / Flood répété' },
              { name: '🤬 Comportement irrespectueux / Provocation', value: 'Comportement irrespectueux / Provocation' },
              { name: '📢 Publicité non sollicitée (MP/Serveur)', value: 'Publicité non sollicitée' },
              { name: '🔞 Contenu inapproprié / NSFW', value: 'Contenu inapproprié / NSFW' },
              { name: '📌 Hors-sujet répété dans les salons', value: 'Hors-sujet répété' },
              { name: '📜 Non-respect du règlement', value: 'Non-respect du règlement' },
              { name: '❓ Autre raison', value: 'Autre' }
            )
        )
        .addStringOption(o => 
          o.setName('details')
            .setDescription('Précision ou contexte supplémentaire')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Voir les avertissements d\'un membre')
        .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Réinitialiser les avertissements d\'un membre')
        .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('membre', true);
    const db = getWarns();

    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId][targetUser.id]) db[guildId][targetUser.id] = [];

    // Sécurités de base pour l'ajout
    if (sub === 'add') {
      if (targetUser.bot) {
        await interaction.reply({ content: '❌ Tu ne peux pas avertir un bot.', ephemeral: true });
        return;
      }

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({ content: '❌ Tu ne peux pas t\'avertir toi-même.', ephemeral: true });
        return;
      }

      // Construction de la raison combinée (raison prédéfinie + détails éventuels)
      const chosenReason = interaction.options.getString('raison', true);
      const customDetails = interaction.options.getString('details');
      const finalReason = customDetails ? `${chosenReason} — ${customDetails}` : chosenReason;

      const warnObj: Warn = {
        id: Math.random().toString(36).substring(2, 7).toUpperCase(),
        moderator: interaction.user.tag,
        reason: finalReason,
        date: Date.now()
      };

      db[guildId][targetUser.id].push(warnObj);
      saveWarns(db);

      // Notification en MP (échoue silencieusement si les MPs sont désactivés)
      await targetUser.send(`⚠️ Tu as reçu un avertissement sur **${interaction.guild.name}** pour : *${finalReason}*`).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('⚠️ Avertissement Ajouté')
        .addFields(
          { name: 'Membre', value: `${targetUser.tag}`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Total warns', value: `\`${db[guildId][targetUser.id].length}\``, inline: true },
          { name: 'Raison', value: `\`${finalReason}\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'list') {
      const warns = db[guildId][targetUser.id];
      if (warns.length === 0) {
        await interaction.reply({ content: `✅ **${targetUser.tag}** n'a aucun avertissement.`, ephemeral: true });
        return;
      }

      const desc = warns.map((w, i) => `**#${i + 1}** (\`${w.id}\`) — *${w.reason}*\n└ Modérateur : **${w.moderator}** (<t:${Math.floor(w.date / 1000)}:d>)`).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`📋 Avertissements de ${targetUser.tag} (${warns.length})`)
        .setDescription(desc)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'clear') {
      db[guildId][targetUser.id] = [];
      saveWarns(db);

      await interaction.reply({ content: `🧹 Tous les avertissements de **${targetUser.tag}** ont été supprimés.` });
    }
  }
};