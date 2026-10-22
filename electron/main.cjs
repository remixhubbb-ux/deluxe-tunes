const { app, BrowserWindow, shell, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');

const DEFAULT_DISCORD_APP_ID = '1550514971572445324';
const APP_SCHEME = 'deluxetunes';
let serverProcess = null;
let discordRpcClient = null;
let discordRpcReady = false;
let discordPresence = null;
let discordRpcConnecting = false;
let discordRpcRetryTimer = null;

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}]);

function getDiscordRpcClientId() {
  return process.env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_APP_ID;
}

async function setDiscordRpcPresence(payload) {
  discordPresence = payload || null;
  if (!discordRpcClient || !discordRpcReady) return false;
  try {
    const timestamps = {};
    if (Number.isFinite(Number(payload?.startedAt))) timestamps.start = Number(payload.startedAt);
    if (Number.isFinite(Number(payload?.endedAt))) timestamps.end = Number(payload.endedAt);
    if (!Object.keys(timestamps).length) timestamps.start = Date.now();
    await discordRpcClient.request('SET_ACTIVITY', {
      pid: process.pid,
      activity: {
        type: 2,
        details: payload?.details || 'Deluxe Tunes',
        state: payload?.state || 'Listening on Deluxe Tunes',
        timestamps,
        assets: {
          large_image: payload?.largeImageKey || 'deluxetunes',
          small_image: payload?.smallImageKey || 'deluxe_tunes',
          large_text: payload?.largeImageText || 'Deluxe Tunes',
          small_text: payload?.smallImageText || 'Deluxe Tunes',
        },
        instance: false,
      },
    });
    return true;
  } catch (error) {
    console.warn('Discord Rich Presence update failed:', error?.message || error);
    return false;
  }
}

async function clearDiscordRpcPresence() {
  discordPresence = null;
  if (!discordRpcClient || !discordRpcReady) return false;
  try {
    await discordRpcClient.clearActivity();
    return true;
  } catch (error) {
    console.warn('Discord Rich Presence clear failed:', error?.message || error);
    return false;
  }
}

function scheduleDiscordRpcRetry() {
  if (discordRpcRetryTimer || !getDiscordRpcClientId()) return;
  discordRpcRetryTimer = setTimeout(() => {
    discordRpcRetryTimer = null;
    initializeDiscordRpc();
  }, 10000);
}

async function initializeDiscordRpc() {
  const clientId = getDiscordRpcClientId();
  if (!clientId || discordRpcConnecting || discordRpcReady) return;
  discordRpcConnecting = true;
  try {
    const { Client: DiscordRpcClient } = require('discord-rpc');
    discordRpcClient = new DiscordRpcClient({ transport: 'ipc' });
    discordRpcClient.on('ready', async () => {
      discordRpcReady = true;
      console.log('Deluxe Tunes Discord Rich Presence ready');
      if (discordPresence) await setDiscordRpcPresence(discordPresence);
    });
    discordRpcClient.on('disconnected', () => {
      discordRpcReady = false;
      discordRpcClient = null;
      scheduleDiscordRpcRetry();
    });
    await discordRpcClient.login({ clientId });
  } catch (error) {
    discordRpcReady = false;
    discordRpcClient = null;
    console.warn('Discord Rich Presence is unavailable:', error?.message || error);
    scheduleDiscordRpcRetry();
  } finally {
    discordRpcConnecting = false;
  }
}

ipcMain.handle('open-external', (_event, url) => {
  if (typeof url !== 'string' || !url) return false;
  try {
    shell.openExternal(url);
    return true;
  } catch (error) {
    console.warn('Failed to open external auth URL:', error);
    return false;
  }
});

ipcMain.handle('discord-rpc-set-presence', async (_event, payload) => {
  return setDiscordRpcPresence(payload);
});

ipcMain.handle('discord-rpc-clear-presence', async () => {
  return clearDiscordRpcPresence();
});

function startLocalServer() {
  if (serverProcess) return;

  const serverEntry = path.join(__dirname, '..', 'server.mjs');
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DELUXE_TUNES_DATA_DIR: path.join(app.getPath('userData'), 'server-data'),
    },
  });

  serverProcess.on('error', () => {});
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'dist', 'logo.ico');
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    icon: iconPath,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#05080b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL(`${APP_SCHEME}://app/app.html`);

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  const distPath = path.resolve(__dirname, '..', 'dist');
  protocol.handle(APP_SCHEME, request => {
    const url = new URL(request.url);
    if (url.hostname !== 'app' || !['GET', 'HEAD'].includes(request.method)) {
      return new Response('Not found', { status: 404 });
    }

    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'app.html';
    const filePath = path.resolve(distPath, relativePath);
    if (!filePath.startsWith(`${distPath}${path.sep}`)) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
  app.setAppUserModelId('com.deluxetunes.desktop');
  app.setName('Deluxe Tunes');
  initializeDiscordRpc();
  startLocalServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
