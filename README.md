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

### Sabse aasan tareeqa: "Check My Agents" icon

Desktop par ek icon hai **"Check My Agents"**. Bas usay double-click karo:

- Supervisor turant fresh data padhta hai
- Dashboard khud browser mein khul jata hai
- Dashboard ke andar ek **🔄 Refresh** button hai — usay dabao to bina kuch
  aur khole, seedha naya data dikh jayega (koi .bat dobara chalane ki zaroorat
  nahi)

Pehli baar khulne mein 1-2 second lag sakta hai — bilkul normal hai, ye
background mein chhota sa local program start ho raha hota hai. Isay band
karne ki zaroorat nahi, agle din phir se icon double-click karoge to ye khud
sambhal lega.

### Roz automatic (background mein)

Windows Task Scheduler mein ek task ban chuka hai (`Supervisor Agent Daily
Report`) jo roz **9:30 AM** ko khud chalta hai aur ek saved copy
`reports/latest.html` mein rakh deta hai — taake agar tum "Check My Agents"
na bhi kholo, phir bhi ek record maujood rahe.

### Manual (bina live dashboard ke)

`run-supervisor.bat` par double-click karne se bhi ek saved report ban kar
browser mein khulti hai — lekin isme Refresh button live data nahi layega
(sirf "Check My Agents" wala live dashboard aisa karta hai).

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
src/reportGenerator.js   -- HTML dashboard banata hai
run-supervisor.js        -- one-shot: ek saved report file banata hai
server.js                -- live dashboard: har request par fresh data deta hai
check-my-agents.vbs      -- Desktop icon jo server.js ko hidden chalata hai
run-supervisor.bat       -- double-click launcher (saved report khol deta hai)
run-supervisor-silent.bat-- scheduled task ke liye (background mein chalta hai)
reports/                 -- roz ki saved reports (date-wise + latest.html)
```

## Agar "Check My Agents" kaam na kare

Ye bohot rare hoga, lekin agar double-click karne par browser na khule:

1. Dubara double-click karo (kabhi kabhi pehli baar thoda slow hota hai)
2. Ya seedha browser mein ye address kholo: `http://127.0.0.1:47983/`

## Note: reports GitHub par nahi jaati

`reports/` folder mein real client/prospect naam, email aur business details
hoti hain, isliye `.gitignore` mein ye exclude ki gayi hain — taake koi
sensitive data GitHub par (agar repo public ho) na chala jaye. Reports sirf
tumhare PC par local rehti hain.

## Agar naya agent add karna ho

`config/agents.json` mein ek naya entry add karo, aur `src/collectors/` mein
uske format ke hisaab se ek chhota reader likhwa lena — jab Cafebot ready ho,
yahi kar sakte hain.
