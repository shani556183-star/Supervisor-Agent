# Supervisor Agent

Ye ek chhota Node.js tool hai jo tumhare 3 AI-agent projects ki daily activity
padh kar ek simple, non-technical HTML report banata hai:

1. **Business Operator** (GitHub Actions par cloud mein chalta hai)
2. **Client Outreach Agent** (Windows Scheduled Tasks se is PC par chalta hai)
3. **Master AI Agent (Client Hunt)** (is PC par chalta hai)

Cafebot abhi shamil nahi hai (project ready nahi hai).

## Ye kya karta hai

- Har agent ke logs/status files (ya database) padhta hai
- "Aaj kya hua" ka summary nikalta hai — kitne runs hue, kitne errors aaye
- Agar kuch approval mang raha hai ya masla lag raha hai, to **sirf FLAG karta hai**
- Ek combined HTML report banata hai: `reports/latest.html`

## Ye kya NAHI karta

- Kisi bhi agent ka code ya data **kabhi nahi badalta** — sirf padhta hai (read-only)
- Koi decision khud nahi leta (jaise approval, delete, ya fix) — sab kuch tumhare
  approval ka intezaar karta hai
- Koi paid tool ya cloud service use nahi karta — sab kuch is PC par, free mein chalta hai

## Report kaise dekhein

- **Manually turant dekhna ho:** `run-supervisor.bat` par double-click karo —
  report ban kar seedha browser mein khul jayega
- **Roz automatic:** Windows Task Scheduler mein ek task ban chuka hai
  (`Supervisor Agent Daily Report`) jo roz **9:30 AM** ko chalta hai. Us waqt
  ke baad `reports/latest.html` ko open kar sakte ho (double-click karo).

## Task Scheduler check/change karna ho

- Task ka naam: `Supervisor Agent Daily Report`
- Windows Search mein "Task Scheduler" khol kar "Task Scheduler Library" mein
  is naam se task milega — time change karna ho to yahin se kar sakte ho
- Ya PowerShell mein: `schtasks /change /tn "Supervisor Agent Daily Report" /st 08:00`
  (yahan `08:00` apni pasand ka time daal do)

## Folder structure

```
config/agents.json       -- har agent ka path aur naam
src/collectors/          -- har agent ke liye alag reader
src/reportGenerator.js   -- HTML report banata hai
run-supervisor.js        -- sab kuch chalata hai
run-supervisor.bat       -- double-click launcher (report khol deta hai)
run-supervisor-silent.bat-- scheduled task ke liye (background mein chalta hai)
reports/                 -- roz ki reports (date-wise + latest.html)
```

## Note: reports GitHub par nahi jaati

`reports/` folder mein real client/prospect naam, email aur business details
hoti hain, isliye `.gitignore` mein ye exclude ki gayi hain — taake koi
sensitive data GitHub par (agar repo public ho) na chala jaye. Reports sirf
tumhare PC par local rehti hain.

## Agar naya agent add karna ho

`config/agents.json` mein ek naya entry add karo, aur `src/collectors/` mein
uske format ke hisaab se ek chhota reader likhwa lena — jab Cafebot ready ho,
yahi kar sakte hain.
