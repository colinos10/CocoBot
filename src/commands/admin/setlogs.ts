import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getLogsData, saveLogsData, LogEventType, DEFAULT_TEMPLATES } from '../../utils/logsData.js';

const EVENTS_LIST: { id: LogEventType; label: string; emoji: string; desc: string }[] = [
  { id: 'memberJoin', label: 'Arrivées', emoji: '📥', desc: 'Quand un membre rejoint le serveur' },
  { id: 'memberLeave', label: 'Départs', emoji: '📤', desc: 'Quand un membre quitte le serveur' },
  { id: 'memberKick', label: 'Expulsions (Kick)', emoji: '🚪', desc: 'Quand un membre est expulsé' },
  { id: 'memberBan', label: 'Bannissements (Ban)', emoji: '🔨', desc: 'Quand un membre est banni' },
  { id: 'messageDelete', label: 'Suppression messages', emoji: '🗑️', desc: 'Quand un message est supprimé' },
  { id: 'messageUpdate', label: 'Modification messages', emoji: '✏️', desc: 'Quand un message est édité' },
  { id: 'voiceJoin', label: 'Connexions vocales', emoji: '🔊', desc: 'Quand un membre entre en vocal' },
  { id: 'voiceLeave', label: 'Déconnexions vocales', emoji: '🔇', desc: 'Quand un membre quitte le vocal' },
  { id: 'voiceSwitch', label: 'Changements de vocal', emoji: '🔀', desc: 'Quand un membre change de salon vocal' },
];

function buildPanel(guildId: string) {
  const db = getLogsData();
  const config = db[guildId] || { channelId: '', enabledEvents: {}, customTemplates: {} };
  const enabledMap = config.enabledEvents || {};

  const channelMention = config.channelId ? `<#${config.channelId}>` : '❌ *Non configuré*';

  // Liste des statuts
  const statusList = EVENTS_LIST.map(e => {
    const isEnabled = enabledMap[e.id] ?? true;
    const statusIcon = isEnabled ? '🟢 **Actif**' : '🔴 **Inactif**';
    return `${e.emoji} **${e.label}** : ${statusIcon}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ Panneau de contrôle des Logs')
    .setDescription(
      `📍 **Salon des logs actuel :** ${channelMention}\n\n` +
      `### 📋 État des modules de logs :\n${statusList}\n\n` +
      `*💡 Utilisez les options ci-dessous pour tout gérer en direct.*`
    )
    .setFooter({ text: 'Panel de gestion des logs' })
    .setTimestamp();

  // 1. Menu de sélection du salon
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('logs_select_channel')
    .setPlaceholder('📍 Choisir le salon de réception des logs...')
    .setChannelTypes(ChannelType.GuildText);

  // 2. Menu de bascule d'état (On / Off individuel)
  const toggleSelect = new StringSelectMenuBuilder()
    .setCustomId('logs_toggle_event')
    .setPlaceholder('🔘 Activer / Désactiver un type de log...')
    .addOptions(
      EVENTS_LIST.map(e => {
        const isEnabled = enabledMap[e.id] ?? true;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${e.label} (${isEnabled ? 'Actif' : 'Inactif'})`)
          .setValue(e.id)
          .setDescription(e.desc)
          .setEmoji(isEnabled ? '🟢' : '🔴');
      })
    );

  // 3. Boutons d'actions globales
  const enableAllBtn = new ButtonBuilder()
    .setCustomId('logs_enable_all')
    .setLabel('Tout Activer')
    .setEmoji('🟢')
    .setStyle(ButtonStyle.Success);

  const disableAllBtn = new ButtonBuilder()
    .setCustomId('logs_disable_all')
    .setLabel('Tout Désactiver')
    .setEmoji('🔴')
    .setStyle(ButtonStyle.Danger);

  const editMsgBtn = new ButtonBuilder()
    .setCustomId('logs_edit_custom_text')
    .setLabel('Modifier un texte')
    .setEmoji('✏️')
    .setStyle(ButtonStyle.Primary);

  const rowChannel = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);
  const rowToggle = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(toggleSelect);
  const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(enableAllBtn, disableAllBtn, editMsgBtn);

  return { 
    embeds: [embed], 
    components: [rowChannel, rowToggle, rowButtons] 
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Ouvre le panneau de contrôle et configuration des logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const guildId = interaction.guildId;

    const db = getLogsData();
    if (!db[guildId]) {
      db[guildId] = { channelId: '', customTemplates: {}, enabledEvents: {} };
      saveLogsData(db);
    }

    const panelData = buildPanel(guildId);
    const response = await interaction.reply({ ...panelData, ephemeral: true, fetchReply: true });

    // Collecteur pour gérer toutes les interactions du panel
    const collector = response.createMessageComponentCollector({
      time: 10 * 60 * 1000 // Actif pendant 10 minutes
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '❌ Vous n\'avez pas ouvert ce panneau.', ephemeral: true });
        return;
      }

      const currentDb = getLogsData();
      if (!currentDb[guildId]) {
        currentDb[guildId] = { channelId: '', customTemplates: {}, enabledEvents: {} };
      }
      if (!currentDb[guildId].enabledEvents) {
        currentDb[guildId].enabledEvents = {};
      }

      // --- 1. SÉLECTION DU SALON ---
      if (i.isChannelSelectMenu() && i.customId === 'logs_select_channel') {
        const selectedChannelId = i.values[0];
        currentDb[guildId].channelId = selectedChannelId;
        saveLogsData(currentDb);

        const updated = buildPanel(guildId);
        await i.update({ embeds: updated.embeds, components: updated.components });
      }

      // --- 2. BASCULE INDIVIDUELLE D'UN LOG ---
      else if (i.isStringSelectMenu() && i.customId === 'logs_toggle_event') {
        const eventId = i.values[0] as LogEventType;
        const currentState = currentDb[guildId].enabledEvents?.[eventId] ?? true;
        currentDb[guildId].enabledEvents![eventId] = !currentState;
        saveLogsData(currentDb);

        const updated = buildPanel(guildId);
        await i.update({ embeds: updated.embeds, components: updated.components });
      }

      // --- 3. BOUTON TOUT ACTIVER ---
      else if (i.isButton() && i.customId === 'logs_enable_all') {
        for (const ev of EVENTS_LIST) {
          currentDb[guildId].enabledEvents![ev.id] = true;
        }
        saveLogsData(currentDb);

        const updated = buildPanel(guildId);
        await i.update({ embeds: updated.embeds, components: updated.components });
      }

      // --- 4. BOUTON TOUT DÉSACTIVER ---
      else if (i.isButton() && i.customId === 'logs_disable_all') {
        for (const ev of EVENTS_LIST) {
          currentDb[guildId].enabledEvents![ev.id] = false;
        }
        saveLogsData(currentDb);

        const updated = buildPanel(guildId);
        await i.update({ embeds: updated.embeds, components: updated.components });
      }

      // --- 5. BOUTON PERSONNALISER UN TEXTE (MODAL) ---
      else if (i.isButton() && i.customId === 'logs_edit_custom_text') {
        const modal = new ModalBuilder()
          .setCustomId('modal_edit_log_template')
          .setTitle('✏️ Modifier un message de log');

        const eventInput = new TextInputBuilder()
          .setCustomId('modal_event_id')
          .setLabel("Nom de l'événement (ex: memberJoin, voiceJoin)")
          .setPlaceholder('memberJoin / memberLeave / messageDelete...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const textInput = new TextInputBuilder()
          .setCustomId('modal_event_template')
          .setLabel('Nouveau modèle du message')
          .setPlaceholder('{user_name} a quitté le serveur {server}...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(eventInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(textInput)
        );

        await i.showModal(modal);

        // Attente de la soumission de la modale
        try {
          const modalSubmission = await i.awaitModalSubmit({
            filter: (m) => m.customId === 'modal_edit_log_template' && m.user.id === interaction.user.id,
            time: 60000
          });

          const targetEvent = modalSubmission.fields.getTextInputValue('modal_event_id').trim() as LogEventType;
          const newTemplate = modalSubmission.fields.getTextInputValue('modal_event_template');

          if (!DEFAULT_TEMPLATES[targetEvent]) {
            await modalSubmission.reply({ 
              content: `❌ L'événement \`${targetEvent}\` n'existe pas. Événements valides : \`${Object.keys(DEFAULT_TEMPLATES).join(', ')}\``, 
              ephemeral: true 
            });
            return;
          }

          if (!currentDb[guildId].customTemplates) {
            currentDb[guildId].customTemplates = {};
          }

          currentDb[guildId].customTemplates![targetEvent] = newTemplate;
          saveLogsData(currentDb);

          await modalSubmission.reply({
            content: `✅ Le modèle pour **${targetEvent}** a été mis à jour !`,
            ephemeral: true
          });
        } catch {
          // Timeout modal ignoré
        }
      }
    });
  }
};