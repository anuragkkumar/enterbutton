@echo off
title Laptop Remote - Local Wi-Fi Links
cd /d "%~dp0"

set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "bin\node.exe" set "NODE_CMD=bin\node.exe"
)

%NODE_CMD% -e "const os=require('os'); const ifs=os.networkInterfaces(); const ips=[]; for(const k in ifs){ for(const i of ifs[k]){ if(i.family==='IPv4' && !i.internal) ips.push({name:k, addr:i.address}); } } ips.sort((a,b)=>(/wi-fi|wlan|wireless/i.test(a.name)?-1:1)); const ip=ips.length>0?ips[0].addr:'127.0.0.1'; const host=os.hostname().toLowerCase(); console.log('\n  ==========================================================='); console.log('    🏠 LAPTOP REMOTE — SAME WI-FI SETUP'); console.log('  ===========================================================\n'); console.log('  Make sure your phone is connected to the SAME WI-FI.\n'); console.log('  Open either link in your phone browser:'); console.log('    ⭐ Apple / mDNS:  http://' + host + '.local:3000'); console.log('    🌐 Direct IP:     http://' + ip + ':3000\n'); console.log('  ===========================================================\n'); try { const q=require('qrcode-terminal'); console.log('  📱 Scan with phone camera to connect:\n'); q.generate('http://' + ip + ':3000', {small:true}, (qr)=>console.log(qr.split('\n').map(l=>'     '+l).join('\n'))); console.log(''); } catch(e){}"

echo.
pause
