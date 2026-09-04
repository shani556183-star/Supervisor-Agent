' Double-click launcher: starts the Supervisor dashboard server (hidden,
' no black window) and opens it in the browser. Safe to double-click again
' any time - if the server is already running it just reuses it.
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = folder

shell.Run "cmd /c node server.js", 0, False
WScript.Sleep 1200
shell.Run "http://127.0.0.1:47983/", 1, False
