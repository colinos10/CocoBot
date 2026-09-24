import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
export const io = new Server(httpServer, {
  cors: { origin: '*' },
});

export function startOverlayServer(port = 4000) {
  httpServer.listen(port, () => {
    console.log(`✅ Serveur overlay WebSocket lancé sur le port ${port}`);
  });
}

export function triggerSaleAnimation(data: { message: string }) {
  io.emit('nouvelle-vente', data);
}