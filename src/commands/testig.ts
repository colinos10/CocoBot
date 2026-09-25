import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

export const command = {
  data: new SlashCommandBuilder()
    .setName('testig')
    .setDescription('Simule une fausse vente Instant Gaming pour tester Twitch et Streamer.bot'),

  async execute(interaction: CommandInteraction) {
    await interaction.reply({ content: '🧪 Simulation d\'une vente Instant Gaming en cours...', ephemeral: true });

    const RELAY_URL = process.env.RELAY_URL; 
    const RELAY_SECRET = process.env.RELAY_SECRET;

    const title = 'Test Jeu Instant Gaming (Simulation)';
    const content = 'Ceci est un test complet pour vérifier le relais Twitch.';
    const image = 'https://via.placeholder.com/150';

    console.log('💰 Simulation d\'une vente Instant Gaming déclenchée via /testig');
    console.log(`🔍 URL cible : ${RELAY_URL}`);
    console.log(`🔍 Secret présent : ${RELAY_SECRET ? 'OUI (longueur: ' + RELAY_SECRET.length + ')' : 'NON'}`);

    try {
      if (!RELAY_URL) {
        throw new Error("La variable RELAY_URL n'est pas définie dans le fichier .env");
      }

      const res = await fetch(RELAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RELAY_SECRET}`,
        },
        body: JSON.stringify({ title, content, image }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Statut HTTP ${res.status} - ${errorText}`);
      }

      console.log('📡 Signal de test envoyé au relais avec succès');
      await interaction.followUp({ content: '✅ Simulation envoyée avec succès ! Regarde ton terminal, Twitch et OBS.', ephemeral: true });
    } catch (err: any) {
      console.error('❌ Erreur lors du test de vente :', err);
      await interaction.followUp({ content: `❌ Erreur lors du test : ${err.message}`, ephemeral: true });
    }
  }
};