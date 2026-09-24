import tmi from 'tmi.js';

const twitchClient = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN, // format: oauth:xxxxxxx
  },
  channels: [process.env.TWITCH_CHANNEL as string],
});

let connected = false;

export async function connectTwitch() {
  if (!connected) {
    await twitchClient.connect();
    connected = true;
    console.log('✅ Connecté au chat Twitch');
  }
}

export async function sendTwitchMessage(message: string) {
  if (!connected) await connectTwitch();
  await twitchClient.say(process.env.TWITCH_CHANNEL as string, message);
}