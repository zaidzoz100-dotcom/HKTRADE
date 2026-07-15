import { io, type Socket } from 'socket.io-client';
import type { PriceSnapshot } from '@workspace/api-client-react';

/**
 * Singleton Socket.io client mirroring the web app's lib/price-socket.ts.
 * Expo bundles run outside the shared proxy, so this connects to the
 * absolute API domain rather than a relative path.
 */
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    socket = io(`https://${domain}`, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function subscribeToPriceUpdates(
  onUpdate: (snapshot: PriceSnapshot) => void,
): () => void {
  const s = getSocket();
  s.on('prices:update', onUpdate);
  return () => {
    s.off('prices:update', onUpdate);
  };
}
