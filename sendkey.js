// sendkey.js — High-performance Win32 keyboard & mouse input simulation
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const csPath = path.join(__dirname, 'KeySender.cs');
const exePath = path.join(__dirname, 'KeySender.exe');

// Comprehensive Win32 Virtual-Key Codes table
const VK = {
  // Common control keys
  BACKSPACE: 0x08,
  TAB: 0x09,
  ENTER: 0x0D,
  SHIFT: 0x10,
  CTRL: 0x11,
  ALT: 0x12,
  PAUSE: 0x13,
  CAPSLOCK: 0x14,
  ESC: 0x1B,
  SPACE: 0x20,
  PAGEUP: 0x21,
  PAGEDOWN: 0x22,
  END: 0x23,
  HOME: 0x24,
  LEFT: 0x25,
  UP: 0x26,
  RIGHT: 0x27,
  DOWN: 0x28,
  PRTSC: 0x2C,
  INSERT: 0x2D,
  DELETE: 0x2E,

  // Windows keys
  WIN: 0x5B,
  RWIN: 0x5C,
  APPS: 0x5D, // context menu key

  // Digits 0-9
  KEY_0: 0x30, KEY_1: 0x31, KEY_2: 0x32, KEY_3: 0x33, KEY_4: 0x34,
  KEY_5: 0x35, KEY_6: 0x36, KEY_7: 0x37, KEY_8: 0x38, KEY_9: 0x39,

  // Letters A-Z
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45, F: 0x46, G: 0x47,
  H: 0x48, I: 0x49, J: 0x4A, K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E,
  O: 0x4F, P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54, U: 0x55,
  V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,

  // Function keys F1-F12
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75,
  F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,

  // OEM Punctuation & Symbols
  OEM_1: 0xBA,      // ; :
  OEM_PLUS: 0xBB,   // = +
  OEM_COMMA: 0xBC,  // , <
  OEM_MINUS: 0xBD,  // - _
  OEM_PERIOD: 0xBE, // . >
  OEM_2: 0xBF,      // / ?
  OEM_3: 0xC0,      // ` ~
  OEM_4: 0xDB,      // [ {
  OEM_5: 0xDC,      // \ |
  OEM_6: 0xDD,      // ] }
  OEM_7: 0xDE,      // ' "

  // Media keys
  VOLUME_MUTE: 0xAD,
  VOLUME_DOWN: 0xAE,
  VOLUME_UP: 0xAF,
  MEDIA_NEXT: 0xB0,
  MEDIA_PREV: 0xB1,
  MEDIA_STOP: 0xB2,
  MEDIA_PLAY_PAUSE: 0xB3,
};

// Recompile KeySender.exe if missing or older than KeySender.cs
function ensureCompiled() {
  let needsCompile = !fs.existsSync(exePath);
  if (!needsCompile && fs.existsSync(csPath)) {
    const csTime = fs.statSync(csPath).mtimeMs;
    const exeTime = fs.statSync(exePath).mtimeMs;
    if (csTime > exeTime) needsCompile = true;
  }

  if (needsCompile) {
    const cscPaths = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
    ];

    let compiled = false;
    for (const csc of cscPaths) {
      if (fs.existsSync(csc)) {
        execSync(`"${csc}" /out:"${exePath}" /nologo /optimize "${csPath}"`, {
          windowsHide: true,
          stdio: 'pipe',
        });
        compiled = true;
        break;
      }
    }

    if (!compiled) {
      execSync(`csc /out:"${exePath}" /nologo /optimize "${csPath}"`, {
        windowsHide: true,
        stdio: 'pipe',
      });
    }
    console.log('  ✅ KeySender.exe recompiled successfully');
  }
}

// Ensure binary exists
ensureCompiled();

// Persistent background process for <1ms latency
let workerProcess = null;

function getWorker() {
  if (workerProcess && !workerProcess.killed && workerProcess.exitCode === null) {
    return workerProcess;
  }

  try {
    workerProcess = spawn(exePath, ['--server'], {
      windowsHide: true,
      stdio: ['pipe', 'ignore', 'ignore'],
    });

    workerProcess.on('error', (err) => {
      console.error('KeySender worker error:', err.message);
      workerProcess = null;
    });

    workerProcess.on('exit', () => {
      workerProcess = null;
    });

    return workerProcess;
  } catch (err) {
    console.error('Failed to spawn KeySender worker:', err.message);
    return null;
  }
}

// Send a raw command line to the worker or fallback to spawnSync
function sendCommand(cmdStr) {
  const worker = getWorker();
  if (worker && worker.stdin && worker.stdin.writable) {
    try {
      worker.stdin.write(cmdStr + '\r\n');
      return;
    } catch (e) {
      workerProcess = null;
    }
  }

  // Fallback if worker pipe is unavailable
  try {
    execSync(`"${exePath}" ${cmdStr}`, { windowsHide: true, stdio: 'pipe' });
  } catch (err) {
    console.error(`Failed to execute "${cmdStr}":`, err.message);
  }
}

/**
 * Tap a single key by Virtual-Key code
 * @param {number} vkCode
 */
function sendKey(vkCode) {
  sendCommand(`key ${vkCode}`);
}

/**
 * Tap multiple keys sequentially
 * @param {number[]} vkCodes
 */
function sendKeys(vkCodes) {
  if (!Array.isArray(vkCodes) || vkCodes.length === 0) return;
  for (const vk of vkCodes) {
    sendCommand(`key ${vk}`);
  }
}

/**
 * Hold down modifier keys, tap target key, release modifier keys
 * @param {number[]} modifiers Array of modifier VKs (e.g. [VK.CTRL, VK.ALT])
 * @param {number} key Target VK (e.g. VK.DELETE)
 */
function sendCombo(modifiers, key) {
  if (!modifiers || modifiers.length === 0) {
    sendKey(key);
    return;
  }
  const modStr = modifiers.join(',');
  sendCommand(`combo ${modStr} ${key || 0}`);
}

/**
 * Type full Unicode text string (supports spaces, newlines, special chars, emojis)
 * @param {string} text
 */
function sendText(text) {
  if (!text) return;
  const b64 = Buffer.from(text, 'utf8').toString('base64');
  sendCommand(`text ${b64}`);
}

/**
 * Move mouse cursor relative to current position
 * @param {number} dx
 * @param {number} dy
 */
function sendMouseMove(dx, dy) {
  sendCommand(`mouse ${Math.round(dx)} ${Math.round(dy)}`);
}

/**
 * Click mouse button
 * @param {'left'|'right'|'middle'|'double'} button
 */
function sendMouseClick(button = 'left') {
  sendCommand(`click ${button}`);
}

/**
 * Scroll mouse wheel
 * @param {number} delta
 */
function sendMouseScroll(delta) {
  sendCommand(`scroll ${Math.round(delta)}`);
}

module.exports = {
  VK,
  sendKey,
  sendKeys,
  sendCombo,
  sendText,
  sendMouseMove,
  sendMouseClick,
  sendMouseScroll,
};
