import { createServer } from 'http';
import { createApp } from './app';
import { config } from './config';
import { initSocketIO } from './lib/socket';
import { initFirebase, isFirebaseReady } from './lib/firebase';

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.io
initSocketIO(httpServer);

// Initialize Firebase Admin (for FCM push notifications)
initFirebase();

httpServer.listen(config.port, () => {
  console.log(`🚀 TIA API running on http://localhost:${config.port}`);
  console.log(`📄 Swagger docs at http://localhost:${config.port}/docs`);
  console.log(`🔌 Socket.io ready`);
  console.log(`🔔 FCM Push: ${isFirebaseReady() ? 'ENABLED' : 'DISABLED (no credentials)'}`);
  console.log(`🌍 Environment: ${config.env}`);
});
