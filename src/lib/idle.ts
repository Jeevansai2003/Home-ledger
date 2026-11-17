// Inactivity settings.
export const IDLE_LIMIT_MS = 5 * 60 * 1000; // log out after 5 minutes without activity
export const WARNING_MS = 0; // 0 = log out silently. Use 30 * 1000 to show a "Still there?" warning first.
export const PING_EVERY_MS = 60 * 1000; // while you are active, the browser tells the server at most this often

// The server allows a little extra time, so a slow heartbeat never logs you out early.
export const SERVER_IDLE_LIMIT_MS = IDLE_LIMIT_MS + 60 * 1000;
export const TOUCH_EVERY_MS = 20 * 1000; // the server records activity at most this often



