import 'dotenv/config';

const visorOrigin = process.env.VISOR_ORIGIN;
const dashboardOrigin = process.env.DASHBOARD_ORIGIN;

if (!visorOrigin || !dashboardOrigin) {
  throw new Error(
    'VISOR_ORIGIN y DASHBOARD_ORIGIN deben estar configurados.',
  );
}

export const GATEWAY_CONFIG = {
  cors: {
    origin: [visorOrigin, dashboardOrigin],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingInterval: 25000,
  pingTimeout: 60000,
}
