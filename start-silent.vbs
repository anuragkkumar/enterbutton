Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = strDir

nodePath = "C:\Program Files\nodejs\node.exe"
If Not objFSO.FileExists(nodePath) Then
    nodePath = "node.exe"
End If

objShell.Run """" & nodePath & """ """ & strDir & "\server.js""", 0, False
