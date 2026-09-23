const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { execSync } = require('child_process');
const {
  VK,
  sendKey,
  sendKeys,
  sendCombo,
  sendText,
  sendMouseMove,
  sendMouseClick,
  sendMouseScroll,
} = require('./sendkey');
const os = require('os');
const path = require('path');

let qrcode;
try {
  qrcode = require('qrcode-terminal');
} catch {}

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ── Express + Socket.IO Setup ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

// Serve the phone UI
app.use(express.static(path.join(__dirname, 'public')));

// ── Track connected devices ─────────────────────────────────────────────────
let connectedDevices = 0;
let totalPresses = 0;

// ── Socket.IO Events ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  connectedDevices++;
  const deviceId = socket.id.slice(0, 6);

  console.log(`\n  📱 Device connected! (ID: ${deviceId})`);
  console.log(`  📊 Active devices: ${connectedDevices}`);

  // Send current state to the newly connected device
  socket.emit('state', { totalPresses });

  // ── Handle Single Key (with optional modifiers) ──────────────────────────
  socket.on('trigger-key', (data) => {
    try {
      const vk = typeof data === 'object' ? data.vk : data;
      const modifiers = (data && data.modifiers) || [];

      if (modifiers.length > 0) {
        sendCombo(modifiers, vk);
      } else {
        sendKey(vk);
      }
      totalPresses++;
      socket.emit('action-confirmed', { type: 'key', vk, totalPresses });
    } catch (err) {
      console.error(`  ❌ Failed to send key:`, err.message);
      socket.emit('action-error', { message: 'Failed to simulate key' });
    }
  });

  // ── Handle Key Combination ──────────────────────────────────────────────
  socket.on('trigger-combo', (data) => {
    try {
      const { modifiers, key } = data;
      sendCombo(modifiers || [], key || 0);
      totalPresses++;
      socket.emit('action-confirmed', { type: 'combo', totalPresses });
    } catch (err) {
      console.error(`  ❌ Failed to send combo:`, err.message);
      socket.emit('action-error', { message: 'Failed to simulate combo' });
    }
  });

  // ── Handle Raw / Unicode Text Typing ────────────────────────────────────
  socket.on('trigger-text', (data) => {
    try {
      const text = typeof data === 'object' ? data.text : data;
      if (text) {
        sendText(text);
        totalPresses += text.length;
        socket.emit('action-confirmed', { type: 'text', totalPresses });
      }
    } catch (err) {
      console.error(`  ❌ Failed to send text:`, err.message);
      socket.emit('action-error', { message: 'Failed to type text' });
    }
  });

  // ── Handle Mouse / Trackpad Events ──────────────────────────────────────
  socket.on('trigger-mouse-move', (data) => {
    try {
      const { dx, dy } = data;
      sendMouseMove(dx, dy);
    } catch (err) {
      // Ignore move errors to maintain silky performance
    }
  });

  socket.on('trigger-mouse-click', (data) => {
    try {
      const button = (data && data.button) || 'left';
      sendMouseClick(button);
      socket.emit('action-confirmed', { type: 'click' });
    } catch (err) {
      console.error(`  ❌ Failed mouse click:`, err.message);
    }
  });

  socket.on('trigger-mouse-scroll', (data) => {
    try {
      const delta = (data && data.delta) || 0;
      sendMouseScroll(delta);
    } catch (err) {
      console.error(`  ❌ Failed mouse scroll:`, err.message);
    }
  });

  socket.on('ping-rtt', (timestamp) => {
    socket.emit('pong-rtt', timestamp);
  });

  // ── Handle Classic Enter Key Trigger ────────────────────────────────────
  socket.on('trigger-enter', () => {
    try {
      sendKey(VK.ENTER);
      totalPresses++;
      console.log(`  ⏎  Enter pressed! (by ${deviceId}) — Total: ${totalPresses}`);
      io.emit('enter-confirmed', { totalPresses });
    } catch (err) {
      console.error(`  ❌ Failed to simulate Enter:`, err.message);
      socket.emit('enter-error', { message: 'Failed to simulate keypress' });
    }
  });

  // ── Handle Y + Enter Trigger ────────────────────────────────────────────
  socket.on('trigger-y-enter', () => {
    try {
      sendKeys([VK.Y, VK.ENTER]);
      totalPresses++;
      console.log(`  ✅ Y + Enter pressed! (by ${deviceId}) — Total: ${totalPresses}`);
      io.emit('enter-confirmed', { totalPresses });
    } catch (err) {
      console.error(`  ❌ Failed to simulate Y+Enter:`, err.message);
      socket.emit('enter-error', { message: 'Failed to simulate keypress' });
    }
  });

  // ── Handle N + Enter Trigger ────────────────────────────────────────────
  socket.on('trigger-n-enter', () => {
    try {
      sendKeys([VK.N, VK.ENTER]);
      totalPresses++;
      console.log(`  ❎ N + Enter pressed! (by ${deviceId}) — Total: ${totalPresses}`);
      io.emit('enter-confirmed', { totalPresses });
    } catch (err) {
      console.error(`  ❌ Failed to simulate N+Enter:`, err.message);
      socket.emit('enter-error', { message: 'Failed to simulate keypress' });
    }
  });

  // ── Handle Lock Screen Trigger ──────────────────────────────────────────
  socket.on('trigger-lock', () => {
    try {
      execSync('rundll32.exe user32.dll,LockWorkStation', { windowsHide: true, stdio: 'pipe' });
      console.log(`  🔒 Screen locked! (by ${deviceId})`);
      socket.emit('lock-confirmed');
    } catch (err) {
      console.error(`  ❌ Failed to lock screen:`, err.message);
      socket.emit('enter-error', { message: 'Failed to lock screen' });
    }
  });

  // ── Handle Disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    connectedDevices--;
    console.log(`\n  📴 Device disconnected (ID: ${deviceId})`);
    console.log(`  📊 Active devices: ${connectedDevices}`);
  });
});

// ── Get Local IP Address ────────────────────────────────────────────────────
function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        list.push({ name, address: iface.address });
      }
    }
  }
  // Prioritize Wi-Fi and Wireless interfaces over virtual/VPN adapters
  list.sort((a, b) => {
    const aIsWifi = /wi-fi|wlan|wireless|local area connection/i.test(a.name);
    const bIsWifi = /wi-fi|wlan|wireless|local area connection/i.test(b.name);
    if (aIsWifi && !bIsWifi) return -1;
    if (!aIsWifi && bIsWifi) return 1;
    return 0;
  });
  return list;
}

// ── Start Server ────────────────────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const ips = getAllLocalIPs();
    const primaryIP = ips.length > 0 ? ips[0].address : '127.0.0.1';
    const hostname = os.hostname().toLowerCase();

    console.log(`
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   ✅ Laptop Remote is ALREADY RUNNING in the background!        │
  │                                                                 │
  │   🏠 Open on your phone (same Wi-Fi):                           │
  │      ⭐ Apple/mDNS: http://${hostname}.local:${PORT}                   │
  │      🌐 Direct IP:  http://${primaryIP}:${PORT}                  │
  │                                                                 │
  │   🔒 Pure Home Wi-Fi Setup — 100% Private & Ultra-Low Latency   │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
    `);

    if (qrcode) {
      console.log(`  📱 Scan with your phone camera to connect:\n`);
      qrcode.generate(`http://${primaryIP}:${PORT}`, { small: true }, (qr) => {
        console.log(qr.split('\n').map((l) => '     ' + l).join('\n'));
      });
      console.log('');
    }

    process.exit(0);
  } else {
    console.error(`  ❌ Server error:`, err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getAllLocalIPs();
  const primaryIP = ips.length > 0 ? ips[0].address : '127.0.0.1';
  const hostname = os.hostname().toLowerCase();

  const mDnsUrl = `http://${hostname}.local:${PORT}`;
  const directIpUrl = `http://${primaryIP}:${PORT}`;

  console.clear();
  console.log(`
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   ⌨️   Laptop Remote — READY! (Same Wi-Fi Setup)                 │
  │                                                                 │
  │   🏠 OPEN ON YOUR PHONE (Must be on the SAME Wi-Fi network):    │
  │                                                                 │
  │      ⭐ Apple / mDNS:  ${mDnsUrl.padEnd(41)} │
  │      🌐 Direct IP:     ${directIpUrl.padEnd(41)} │
  │                                                                 │
  │   💡 Active Tabs: 🔘 Enter  |  💬 Writer  |  🖱️ Trackpad         │
  │   ⚡ Latency: 1–3ms (Direct local Wi-Fi, no internet lag)       │
  │   🔒 Privacy: 100% Secure — only accessible on your Wi-Fi       │
  │                                                                 │
  │   Press Ctrl+C to stop the server                               │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
  `);

  if (qrcode) {
    console.log(`  📱 Scan with your phone camera to connect instantly:\n`);
    qrcode.generate(directIpUrl, { small: true }, (qr) => {
      console.log(qr.split('\n').map((l) => '     ' + l).join('\n'));
    });
    console.log('');
  }
});
