import { Events, Message } from 'discord.js';
import fetch from 'node-fetch';

const SALES_CHANNEL_ID = process.env.IG_SALES_CHANNEL_ID!;
const IG_BOT_ID = process.env.IG_BOT_ID!;
const RELAY_URL = process.env.RELAY_URL!;
const RELAY_SECRET = process.env.RELAY_SECRET!;

export function registerInstantGamingSalesEvent(client: any) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId !== SALES_CHANNEL_ID) return;
    if (message.author.id !== IG_BOT_ID) return; // ✅ on accepte SEULEMENT le bot IG

    const title = message.embeds[0]?.title ?? 'Nouvelle vente';
    const content = message.embeds[0]?.description ?? message.content;
    const image = message.embeds[0]?.image?.url ?? null;

    try {
      const res = await fetch(RELAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RELAY_SECRET}`,
        },
        body: JSON.stringify({
          title,
          content,
          image,
        }),
      });

      if (!res.ok) throw new Error(`Statut HTTP ${res.status}`);
      console.log('✅ Webhook envoyé au relais local avec succès');
    } catch (err) {
      console.error('❌ Erreur envoi webhook vers relais local :', err);
    }
  });
}