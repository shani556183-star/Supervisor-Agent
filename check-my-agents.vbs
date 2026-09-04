' Double-click launcher: starts the Supervisor dashboard server (hidden,
' no black window) and opens it in the browser once it's actually ready.
' Safe to double-click again any time - if the server is already running
' it just reuses it. Writes launcher.log so problems can be diagnosed
' without needing to open a terminal.
Dim fso, folder, shell, logPath, url, i, http, ready

Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = folder

logPath = folder & "\launcher.log"
url = "http://127.0.0.1:47983/"

Sub Log(msg)
  On Error Resume Next
  Dim f
  Set f = fso.OpenTextFile(logPath, 8, True) ' 8 = ForAppending
  f.WriteLine Now & " - " & msg
  f.Close
End Sub

Log "Launching supervisor server..."
shell.Run "cmd /c node server.js", 0, False

' Poll the server instead of guessing a fixed wait time - handles slow
' first-time startup (antivirus scan, cold Node.js boot, etc).
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
ready = False
For i = 1 To 25 ' up to ~25 x 400ms = 10 seconds
  WScript.Sleep 400
  On Error Resume Next
  Err.Clear
  http.Open "GET", url, False
  http.SetTimeouts 800, 800, 800, 800
  http.Send
  If Err.Number = 0 And http.Status = 200 Then
    ready = True
    Exit For
  End If
  On Error Goto 0
Next

If ready Then
  Log "Server ready after " & (i * 400) & "ms. Opening browser."
  shell.Run url, 1, False
Else
  Log "Server did not respond in time. Showing error to user."
  MsgBox "Dashboard start nahi ho saka." & vbCrLf & vbCrLf & _
    "Kya karo:" & vbCrLf & _
    "1) Ye icon dobara double-click karo (kabhi kabhi pehli baar zyada time lagta hai)" & vbCrLf & _
    "2) Agar phir bhi na khule, check karo ke Node.js installed hai" & vbCrLf & _
    "3) Ya seedha browser mein ye address kholo: " & url, _
    vbExclamation, "Check My Agents"
End If
