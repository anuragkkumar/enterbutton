# ⚡ Laptop Remote Control (Same Wi-Fi Setup)

> Turn your phone into an ultra-fast **wireless remote control** for your laptop on your home or office Wi-Fi.  
> Direct local connection with **ultra-low latency (1–3ms)**, 100% private & secure, with zero internet exposure!

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 1. 🔘 Vibe Enter & Quick Actions
- **Giant Enter Button**: Huge, responsive, glowing button with real-time feedback.
- **`Y + Enter` & `N + Enter`**: Rapid 1-tap confirmation chips for CLI prompts and terminal scripts.
- **🔒 Lock Screen**: Instantly lock your Windows PC (`Win + L`) from across the room.

### 2. 💬 Writer (Voice Dictation & Text)
- Speak into your phone's microphone using voice dictation or type on your mobile keyboard.
- Tap **Send to Laptop** to stream the text straight into your laptop cursor with full Unicode fidelity.
- Quick snippet chips (`git status`, `npm run dev`, `clear`, etc.).

### 3. 🖱️ High-Precision Trackpad
- Smooth touch surface to steer your laptop's mouse pointer with 60 FPS hardware batching.
- High-speed cursor control with customizable speed multipliers.
- 1-finger tap = Left Click.
- 2-finger tap = Right Click.
- 2-finger drag = Smooth Scroll.
- Tactile Left & Right hardware click buttons.

---

## 🚀 How to Run

### 1. Start the Remote
Double-click **`start.bat`**.  
The terminal will display your direct local Wi-Fi links and a QR code you can scan with your phone.

### 2. Connect Your Phone
Make sure your phone is connected to the **SAME Wi-Fi** as your laptop (or your phone's mobile hotspot).
- **Scan the QR Code** in the terminal with your phone camera, OR
- Open either link in Safari or Chrome on your phone:
  - `http://dev.local:3000` (Apple / mDNS supported devices)
  - `http://<your-local-ip>:3000` (Direct IP)

### 3. View Links Anytime
Double-click **`show-link.bat`** anytime to view your local Wi-Fi links and terminal QR code.

### 4. How to Stop
Double-click **`stop.bat`** to shut down the server.

*(Tip: In Chrome or Safari on your phone, tap **"Add to Home Screen"** to use it like a native full-screen app!)*
