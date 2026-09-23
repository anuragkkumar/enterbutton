// ═══════════════════════════════════════════════════════════════════════════════
// LAPTOP REMOTE — CLIENT LOGIC (ENTER, WRITER, TRACKPAD)
// ═══════════════════════════════════════════════════════════════════════════════

// ── DOM References ──────────────────────────────────────────────────────────
const connectionStatus = document.getElementById('connectionStatus');
const statusLabel = connectionStatus.querySelector('.status-label');
const deviceStatusText = document.getElementById('deviceStatusText');
const pressCountDisplay = document.getElementById('pressCount');
const latencyDisplay = document.getElementById('latency');
const flashOverlay = document.getElementById('flashOverlay');
const hapticToggle = document.getElementById('hapticToggle');

// Navigation Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Vibe Enter Mode
const enterBtn = document.getElementById('enterBtn');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const vibeLockBtn = document.getElementById('vibeLockBtn');
const headerLockBtn = document.getElementById('headerLockBtn');
const ripple = document.getElementById('ripple');

// Writer (Quick Text & Dictation)
const quickTextInput = document.getElementById('quickTextInput');
const sendTextBtn = document.getElementById('sendTextBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const snippetButtons = document.querySelectorAll('.snippet-btn');

// Trackpad
const trackpadSurface = document.getElementById('trackpadSurface');
const mouseLeftBtn = document.getElementById('mouseLeftBtn');
const mouseRightBtn = document.getElementById('mouseRightBtn');

// ── Application State ───────────────────────────────────────────────────────
let isConnected = false;
let totalPresses = 0;
let lastActionTime = 0;
let hapticsEnabled = true;

// ── Socket.IO Connection ─────────────────────────────────────────────────────
const socket = io({
  transports: ['websocket', 'polling'],
  upgrade: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

// Periodic real-time network ping check (every 2.5s)
setInterval(() => {
  if (isConnected) {
    socket.emit('ping-rtt', Date.now());
  }
}, 2500);

socket.on('pong-rtt', (timestamp) => {
  if (timestamp && latencyDisplay) {
    const rtt = Date.now() - timestamp;
    latencyDisplay.textContent = `${rtt}ms`;
    if (rtt < 35) {
      latencyDisplay.style.color = '#55efc4'; // Ultra-low ping (Local Wi-Fi)
    } else if (rtt < 90) {
      latencyDisplay.style.color = '#ffeaa7'; // Normal
    } else {
      latencyDisplay.style.color = '#ff7675'; // Internet tunnel / high ping
    }
  }
});

function getNetworkMode() {
  return { label: '📶 Connected', subtitle: 'Same Wi-Fi Remote' };
}

socket.on('connect', () => {
  isConnected = true;
  connectionStatus.className = 'connection-pill connected';
  const mode = getNetworkMode();
  statusLabel.textContent = mode.label;
  deviceStatusText.textContent = mode.subtitle;
  setButtonsEnabled(true);
});

socket.on('disconnect', () => {
  isConnected = false;
  connectionStatus.className = 'connection-pill disconnected';
  statusLabel.textContent = 'Disconnected';
  deviceStatusText.textContent = 'Reconnecting...';
  setButtonsEnabled(false);
});

socket.on('connect_error', () => {
  isConnected = false;
  connectionStatus.className = 'connection-pill disconnected';
  statusLabel.textContent = 'Connecting...';
  setButtonsEnabled(false);
});

socket.on('state', (data) => {
  if (data && typeof data.totalPresses === 'number') {
    totalPresses = data.totalPresses;
    pressCountDisplay.textContent = totalPresses;
  }
});

socket.on('enter-confirmed', (data) => {
  updateLatency();
  if (data && typeof data.totalPresses === 'number') {
    totalPresses = data.totalPresses;
    pressCountDisplay.textContent = totalPresses;
  }
  showFlash('success');
  if (enterBtn) {
    enterBtn.classList.add('pressed');
    setTimeout(() => enterBtn.classList.remove('pressed'), 200);
  }
});

socket.on('action-confirmed', (data) => {
  updateLatency();
  if (data && typeof data.totalPresses === 'number') {
    totalPresses = data.totalPresses;
    pressCountDisplay.textContent = totalPresses;
  }
  showFlash('success');
});

socket.on('lock-confirmed', () => {
  updateLatency();
  showFlash('success');
});

socket.on('enter-error', () => {
  showFlash('error');
});

socket.on('action-error', () => {
  showFlash('error');
});

function updateLatency() {
  if (lastActionTime > 0) {
    const lat = Date.now() - lastActionTime;
    latencyDisplay.textContent = `${lat}ms`;
  }
}

// ── Feedback (Haptics & Flash) ──────────────────────────────────────────────
function vibrate(pattern = 15) {
  if (!hapticsEnabled || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch (e) {}
}

function showFlash(type = 'success') {
  if (!flashOverlay) return;
  flashOverlay.className = `flash-overlay ${type}`;
  setTimeout(() => {
    flashOverlay.className = 'flash-overlay';
  }, 120);
}

function triggerRipple() {
  if (!ripple) return;
  ripple.classList.remove('active');
  void ripple.offsetWidth;
  ripple.classList.add('active');
}

function setButtonsEnabled(enabled) {
  const opacity = enabled ? '1' : '0.5';
  const pointerEvents = enabled ? 'auto' : 'none';
  [enterBtn, yesBtn, noBtn, vibeLockBtn, headerLockBtn, sendTextBtn].forEach((btn) => {
    if (btn) {
      btn.style.opacity = opacity;
      btn.style.pointerEvents = pointerEvents;
    }
  });
}

// Haptic toggle button
if (hapticToggle) {
  hapticToggle.addEventListener('click', () => {
    hapticsEnabled = !hapticsEnabled;
    hapticToggle.querySelector('.haptic-text').textContent = `Haptics: ${hapticsEnabled ? 'ON' : 'OFF'}`;
    vibrate(25);
  });
}

// ── Tab Navigation ──────────────────────────────────────────────────────────
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    switchTab(target);
  });
});

function switchTab(tabId) {
  tabButtons.forEach((b) => {
    const isActive = b.getAttribute('data-tab') === tabId;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });

  tabPanes.forEach((p) => {
    p.classList.toggle('active', p.id === `pane${capitalize(tabId)}`);
  });

  localStorage.setItem('laptop_remote_tab_v2', tabId);
  vibrate(10);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Restore last active tab
const savedTab = localStorage.getItem('laptop_remote_tab_v2');
if (savedTab && document.getElementById(`pane${capitalize(savedTab)}`)) {
  switchTab(savedTab);
}

// ── TAB 1: Vibe Enter Mode Handlers ─────────────────────────────────────────
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    if (!isConnected) return;
    lastActionTime = Date.now();
    socket.emit('trigger-enter');
    vibrate([20, 10, 20]);
    triggerRipple();
  });
}

if (yesBtn) {
  yesBtn.addEventListener('click', () => {
    if (!isConnected) return;
    lastActionTime = Date.now();
    socket.emit('trigger-y-enter');
    vibrate([15, 10, 15]);
  });
}

if (noBtn) {
  noBtn.addEventListener('click', () => {
    if (!isConnected) return;
    lastActionTime = Date.now();
    socket.emit('trigger-n-enter');
    vibrate([15, 10, 15]);
  });
}

function triggerLockScreen() {
  if (!isConnected) return;
  lastActionTime = Date.now();
  socket.emit('trigger-lock');
  vibrate([50, 40, 50]);
}

if (vibeLockBtn) vibeLockBtn.addEventListener('click', triggerLockScreen);
if (headerLockBtn) headerLockBtn.addEventListener('click', triggerLockScreen);

// ── TAB 2: Writer (Phone Keyboard & Voice Dictation) ────────────────────────
if (sendTextBtn && quickTextInput) {
  sendTextBtn.addEventListener('click', () => {
    const text = quickTextInput.value;
    if (!text || !isConnected) return;

    lastActionTime = Date.now();
    socket.emit('trigger-text', { text: text + '\n' });
    vibrate(30);
    quickTextInput.value = '';
    quickTextInput.focus();
  });
}

if (clearTextBtn && quickTextInput) {
  clearTextBtn.addEventListener('click', () => {
    quickTextInput.value = '';
    quickTextInput.focus();
    vibrate(10);
  });
}

// Quick Snippets
snippetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const snippet = btn.getAttribute('data-snippet');
    if (!snippet || !isConnected) return;

    lastActionTime = Date.now();
    socket.emit('trigger-text', { text: snippet + '\n' });
    vibrate(20);
  });
});

// ── TAB 3: Mouse Trackpad ───────────────────────────────────────────────────
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let touchStartTime = 0;
let isTwoFingerGesture = false;
let lastScrollY = 0;

// Pointer Speed Settings
let mouseSpeedMultiplier = parseFloat(localStorage.getItem('laptop_remote_mouse_speed') || '3.5');
const speedButtons = document.querySelectorAll('.speed-btn');

function updateSpeedButtonsUI() {
  speedButtons.forEach((btn) => {
    const spd = parseFloat(btn.getAttribute('data-speed'));
    btn.classList.toggle('active', Math.abs(spd - mouseSpeedMultiplier) < 0.1);
  });
}

updateSpeedButtonsUI();

speedButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    mouseSpeedMultiplier = parseFloat(btn.getAttribute('data-speed'));
    localStorage.setItem('laptop_remote_mouse_speed', mouseSpeedMultiplier.toString());
    updateSpeedButtonsUI();
    vibrate(20);
  });
});

// ── Trackpad Touch Event Handlers with Smooth Frame Batching ──────────────
let pendingDx = 0;
let pendingDy = 0;
let mouseMoveRaf = null;

function flushMouseMove() {
  if (Math.abs(pendingDx) > 0.05 || Math.abs(pendingDy) > 0.05) {
    socket.emit('trigger-mouse-move', { dx: pendingDx, dy: pendingDy });
    pendingDx = 0;
    pendingDy = 0;
  }
  mouseMoveRaf = null;
}

let pendingScroll = 0;
let scrollRaf = null;

function flushScroll() {
  if (Math.abs(pendingScroll) > 1) {
    socket.emit('trigger-mouse-scroll', { delta: pendingScroll });
    pendingScroll = 0;
  }
  scrollRaf = null;
}

if (trackpadSurface) {
  trackpadSurface.addEventListener('touchstart', (e) => {
    if (!isConnected) return;
    const touches = e.touches;
    touchStartTime = Date.now();

    if (touches.length === 1) {
      touchStartX = touches[0].clientX;
      touchStartY = touches[0].clientY;
      lastTouchX = touches[0].clientX;
      lastTouchY = touches[0].clientY;
      isTwoFingerGesture = false;
    } else if (touches.length === 2) {
      isTwoFingerGesture = true;
      lastScrollY = (touches[0].clientY + touches[1].clientY) / 2;
    }
  }, { passive: true });

  trackpadSurface.addEventListener('touchmove', (e) => {
    if (!isConnected) return;
    const touches = e.touches;

    if (touches.length === 1 && !isTwoFingerGesture) {
      const currentX = touches[0].clientX;
      const currentY = touches[0].clientY;

      const rawDx = currentX - lastTouchX;
      const rawDy = currentY - lastTouchY;

      // High-speed ballistic scaling
      const speed = Math.hypot(rawDx, rawDy);
      const accel = speed > 8 ? 1.6 : 1.1;

      const dx = rawDx * mouseSpeedMultiplier * accel;
      const dy = rawDy * mouseSpeedMultiplier * accel;

      lastTouchX = currentX;
      lastTouchY = currentY;

      pendingDx += dx;
      pendingDy += dy;

      if (!mouseMoveRaf) {
        mouseMoveRaf = requestAnimationFrame(flushMouseMove);
      }
    } else if (touches.length === 2) {
      // Two-finger scroll
      const currentScrollY = (touches[0].clientY + touches[1].clientY) / 2;
      const deltaY = (currentScrollY - lastScrollY) * 2.5;
      lastScrollY = currentScrollY;

      pendingScroll += deltaY;
      if (!scrollRaf) {
        scrollRaf = requestAnimationFrame(flushScroll);
      }
    }
  }, { passive: true });

  trackpadSurface.addEventListener('touchend', (e) => {
    if (!isConnected) return;
    if (mouseMoveRaf) {
      cancelAnimationFrame(mouseMoveRaf);
      flushMouseMove();
    }
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      flushScroll();
    }

    const touchDuration = Date.now() - touchStartTime;

    // Tap detection: short duration and negligible movement
    if (e.changedTouches.length === 1 && !isTwoFingerGesture) {
      const dist = Math.hypot(
        e.changedTouches[0].clientX - touchStartX,
        e.changedTouches[0].clientY - touchStartY
      );

      if (touchDuration < 250 && dist < 8) {
        // 1-finger tap = Left Click
        socket.emit('trigger-mouse-click', { button: 'left' });
        vibrate(15);
      }
    } else if (isTwoFingerGesture && touchDuration < 300) {
      // 2-finger tap = Right Click
      socket.emit('trigger-mouse-click', { button: 'right' });
      vibrate([15, 10, 15]);
    }
  }, { passive: true });
}

// Trackpad Left / Right Click buttons
if (mouseLeftBtn) {
  mouseLeftBtn.addEventListener('click', () => {
    if (!isConnected) return;
    socket.emit('trigger-mouse-click', { button: 'left' });
    vibrate(15);
  });
}

if (mouseRightBtn) {
  mouseRightBtn.addEventListener('click', () => {
    if (!isConnected) return;
    socket.emit('trigger-mouse-click', { button: 'right' });
    vibrate([15, 10, 15]);
  });
}



