/**
 * Entry point for MyDevil.net Phusion Passenger.
 *
 * Passenger sets the PORT environment variable to the socket/port
 * it expects the app to listen on. Astro's standalone adapter
 * reads HOST and PORT from env automatically.
 *
 * We ensure HOST is set to 0.0.0.0 so the server accepts connections
 * from Passenger's reverse proxy (not just localhost).
 */

// Ensure the server binds to all interfaces (required for Passenger)
if (!process.env.HOST) {
  process.env.HOST = '0.0.0.0';
}

import('./dist/server/entry.mjs').catch((err) => {
  console.error('[app.js] Failed to start Astro server:', err.message || err);
  process.exit(1);
});
