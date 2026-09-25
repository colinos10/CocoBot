import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import fetch from 'node-fetch'; // ou fetch global si tu es en Node 18+

const PC_RELAY_URL = process.env.PC_RELAY_URL; 
const PC_RELAY_SECRET = process.env.PC_RELAY_SECRET;

export const data = new SlashCommandBuilder()
  .setName('testig')
  .setDescription('Simule une fausse vente Instant Gaming pour tester Twitch et Streamer.bot');

export async function execute(interaction: CommandInteraction) {
  await interaction.reply({ content: '🧪 Simulation d\'une vente Instant Gaming en cours...', ephemeral: true });

  const title = 'Test Jeu Instant Gaming (Simulation)';
  const content = 'Ceci est un test complet pour vérifier le relais Twitch.';
  const image = 'https://via.placeholder.com/150';

  console.log('💰 Simulation d\'une vente Instant Gaming déclenchée via /testig');

  // Si tu as une fonction partagée, tu peux l'appeler ici. 
  // Sinon, on simule l'envoi vers ton relais / Twitch directement :
  try {
    if (PC_RELAY_URL) {
      const res = await fetch(PC_RELAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PC_RELAY_SECRET}`,
        },
        body: JSON.stringify({ title, content, image }),
      });

      if (!res.ok) throw new Error(`Statut HTTP ${res.status}`);
      console.log('📡 Signal de test envoyé au PC avec succès');
    }

    await interaction.followUp({ content: '✅ Simulation envoyée avec succès ! Regarde ton terminal, Twitch et OBS.', ephemeral: true });
  } catch (err: any) {
    console.error('❌ Erreur lors du test de vente :', err);
    await interaction.followUp({ content: `❌ Erreur lors du test : ${err.message}`, ephemeral: true });
  }
}