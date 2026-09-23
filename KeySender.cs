using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class KeySender
{
    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct HARDWAREINPUT
    {
        public uint uMsg;
        public ushort wParamL;
        public ushort wParamH;
    }

    [StructLayout(LayoutKind.Explicit)]
    struct INPUTUNION
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT
    {
        public uint type;
        public INPUTUNION u;
    }

    const uint INPUT_MOUSE = 0;
    const uint INPUT_KEYBOARD = 1;

    const uint KEYEVENTF_KEYDOWN = 0x0000;
    const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_UNICODE = 0x0004;

    const uint MOUSEEVENTF_MOVE = 0x0001;
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    const uint MOUSEEVENTF_WHEEL = 0x0800;

    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr OpenWindowStation(string lpszWinSta, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SetProcessWindowStation(IntPtr hWinSta);

    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    static extern uint MapVirtualKey(uint uCode, uint uMapType);

    [DllImport("user32.dll")]
    static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    static extern bool CloseWindowStation(IntPtr hWinSta);

    [DllImport("user32.dll")]
    static extern bool CloseDesktop(IntPtr hDesktop);

    static bool isDesktopAttached = false;

    static void EnsureInteractiveDesktop()
    {
        if (isDesktopAttached) return;
        try
        {
            IntPtr hWinsta = OpenWindowStation("WinSta0", false, 0x37F);
            if (hWinsta != IntPtr.Zero)
            {
                SetProcessWindowStation(hWinsta);
                CloseWindowStation(hWinsta);
            }

            IntPtr hDesk = OpenDesktop("default", 0, false, 0x1FF);
            if (hDesk != IntPtr.Zero)
            {
                SetThreadDesktop(hDesk);
                CloseDesktop(hDesk);
            }
            isDesktopAttached = true;
        }
        catch {}
    }

    static void KeyDown(byte vk)
    {
        byte scan = (byte)MapVirtualKey(vk, 0);
        uint flags = KEYEVENTF_KEYDOWN;
        if (IsExtendedKey(vk)) flags |= KEYEVENTF_EXTENDEDKEY;
        keybd_event(vk, scan, flags, UIntPtr.Zero);
    }

    static void KeyUp(byte vk)
    {
        byte scan = (byte)MapVirtualKey(vk, 0);
        uint flags = KEYEVENTF_KEYUP;
        if (IsExtendedKey(vk)) flags |= KEYEVENTF_EXTENDEDKEY;
        keybd_event(vk, scan, flags, UIntPtr.Zero);
    }

    static bool IsExtendedKey(byte vk)
    {
        // Arrow keys, Home, End, Insert, Delete, PgUp, PgDn, Right Ctrl/Alt, NumPad divide/Enter
        return (vk >= 0x21 && vk <= 0x28) || vk == 0x2D || vk == 0x2E || vk == 0x5B || vk == 0x5C;
    }

    static void PressKey(byte vk)
    {
        KeyDown(vk);
        Thread.Sleep(30);
        KeyUp(vk);
        Thread.Sleep(15);
    }

    static void PressCombo(List<byte> modifiers, byte key)
    {
        foreach (byte m in modifiers)
        {
            KeyDown(m);
            Thread.Sleep(10);
        }

        if (key != 0)
        {
            PressKey(key);
        }

        for (int i = modifiers.Count - 1; i >= 0; i--)
        {
            KeyUp(modifiers[i]);
            Thread.Sleep(10);
        }
    }

    static void SendUnicodeText(string text)
    {
        if (string.IsNullOrEmpty(text)) return;
        INPUT[] inputs = new INPUT[text.Length * 2];
        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];
            inputs[i * 2] = new INPUT
            {
                type = INPUT_KEYBOARD,
                u = new INPUTUNION
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = (ushort)c,
                        dwFlags = KEYEVENTF_UNICODE,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };
            inputs[i * 2 + 1] = new INPUT
            {
                type = INPUT_KEYBOARD,
                u = new INPUTUNION
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = (ushort)c,
                        dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };
        }
        SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    static void MoveMouse(int dx, int dy)
    {
        POINT p;
        if (GetCursorPos(out p))
        {
            SetCursorPos(p.X + dx, p.Y + dy);
        }
        else
        {
            mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
        }
    }

    static void MouseClick(string button)
    {
        switch (button.ToLower())
        {
            case "left":
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(15);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                break;
            case "right":
                mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(15);
                mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                break;
            case "middle":
                mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(15);
                mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, UIntPtr.Zero);
                break;
            case "double":
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(50);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                break;
        }
    }

    static void MouseScroll(int delta)
    {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
    }

    static void ExecuteCommand(string line)
    {
        if (string.IsNullOrEmpty(line)) return;
        EnsureInteractiveDesktop();
        string[] parts = line.Trim().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return;

        string cmd = parts[0].ToLower();

        try
        {
            switch (cmd)
            {
                case "key":
                    if (parts.Length > 1)
                    {
                        byte vk;
                        if (byte.TryParse(parts[1], out vk)) PressKey(vk);
                    }
                    break;

                case "down":
                    if (parts.Length > 1)
                    {
                        byte vk;
                        if (byte.TryParse(parts[1], out vk)) KeyDown(vk);
                    }
                    break;

                case "up":
                    if (parts.Length > 1)
                    {
                        byte vk;
                        if (byte.TryParse(parts[1], out vk)) KeyUp(vk);
                    }
                    break;

                case "combo":
                    if (parts.Length >= 2)
                    {
                        // combo mod1,mod2 key
                        List<byte> mods = new List<byte>();
                        string[] modStrs = parts[1].Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                        foreach (string m in modStrs)
                        {
                            byte mVk;
                            if (byte.TryParse(m, out mVk)) mods.Add(mVk);
                        }
                        byte targetKey = 0;
                        if (parts.Length > 2)
                        {
                            byte.TryParse(parts[2], out targetKey);
                        }
                        PressCombo(mods, targetKey);
                    }
                    break;

                case "text":
                    if (parts.Length > 1)
                    {
                        // base64 encoded text
                        byte[] bytes = Convert.FromBase64String(parts[1]);
                        string text = Encoding.UTF8.GetString(bytes);
                        SendUnicodeText(text);
                    }
                    break;

                case "mouse":
                    if (parts.Length >= 3)
                    {
                        int dx = int.Parse(parts[1]);
                        int dy = int.Parse(parts[2]);
                        MoveMouse(dx, dy);
                    }
                    break;

                case "click":
                    if (parts.Length > 1)
                    {
                        MouseClick(parts[1]);
                    }
                    else
                    {
                        MouseClick("left");
                    }
                    break;

                case "scroll":
                    if (parts.Length > 1)
                    {
                        int delta = int.Parse(parts[1]);
                        MouseScroll(delta);
                    }
                    break;

                default:
                    // Backward compatibility: list of VK numbers
                    foreach (string arg in parts)
                    {
                        byte vk;
                        if (byte.TryParse(arg, out vk)) PressKey(vk);
                    }
                    break;
            }
        }
        catch (Exception)
        {
            // Ignore command format errors gracefully
        }
    }

    static void Main(string[] args)
    {
        EnsureInteractiveDesktop();

        if (args.Length == 1 && args[0] == "--server")
        {
            // Persistent stdin command loop
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                if (line == "quit") break;
                ExecuteCommand(line);
            }
        }
        else if (args.Length > 0)
        {
            // Single-shot command line
            string line = string.Join(" ", args);
            ExecuteCommand(line);
        }
    }
}