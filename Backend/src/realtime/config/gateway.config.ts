export const GATEWAY_CONFIG = {
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingInterval: 25000,
  pingTimeout: 60000,
}