'use strict';

const HEALTH_LABELS = {
  ok: { label: 'Sab theek hai', color: '#1a7f37', bg: '#dafbe1' },
  warning: { label: 'Dhyan do', color: '#9a6700', bg: '#fff8c5' },
  no_run: { label: 'Aaj nahi chala', color: '#57606a', bg: '#eaeef2' },
  error: { label: 'Masla hai', color: '#cf222e', bg: '#ffebe9' },
};

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function badge(health) {
  const h = HEALTH_LABELS[health] || HEALTH_LABELS.no_run;
  return `<span class="badge" style="color:${h.color};background:${h.bg}">${esc(h.label)}</span>`;
}

function renderAgentCard(agent) {
  const flagsHtml = agent.flags && agent.flags.length
    ? `<div class="flags">
        <div class="flags-title">⚠️ Iss par tumhari nazar chahiye:</div>
        <ul>${agent.flags.map((f) => `<li>${esc(f.message)}</li>`).join('')}</ul>
      </div>`
    : '';

  const notesHtml = agent.notes && agent.notes.length
    ? `<ul class="notes">${agent.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : `<p class="notes-empty">Koi extra detail nahi.</p>`;

  const errorSamplesHtml = agent.errorSamples && agent.errorSamples.length
    ? `<details class="raw-details">
        <summary>Technical error details dekhein (${agent.errorSamples.length})</summary>
        <pre>${agent.errorSamples.map(esc).join('\n')}</pre>
      </details>`
    : '';

  const lastActivity = agent.lastActivity ? new Date(agent.lastActivity).toLocaleString('en-GB') : 'Pata nahi';

  return `
  <div class="card">
    <div class="card-header">
      <h2>${esc(agent.displayName)}</h2>
      ${badge(agent.health)}
    </div>
    <div class="meta">Chalta hai: ${esc(agent.runsOn)} &nbsp;•&nbsp; Last activity: ${esc(lastActivity)}</div>
    ${flagsHtml}
    <div class="notes-block">
      <div class="notes-title">Aaj kya hua:</div>
      ${notesHtml}
    </div>
    ${errorSamplesHtml}
  </div>`;
}

function overallHealth(agents) {
  if (agents.some((a) => a.health === 'error')) return 'error';
  if (agents.some((a) => a.flags && a.flags.length > 0)) return 'warning';
  if (agents.some((a) => a.health === 'no_run')) return 'warning';
  return 'ok';
}

function generateReport(agents, dateStr) {
  const totalFlags = agents.reduce((sum, a) => sum + (a.flags ? a.flags.length : 0), 0);
  const summaryHealth = overallHealth(agents);
  const summaryText = totalFlags > 0
    ? `${totalFlags} cheez(ein) hain jinpar tumhari approval/nazar chahiye.`
    : 'Sab agents theek chal rahe hain, kuch bhi urgent nahi.';

  const cardsHtml = agents.map(renderAgentCard).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Supervisor Report — ${esc(dateStr)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #f6f8fa; color: #1f2328;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 24px 16px 60px;
  }
  .container { max-width: 760px; margin: 0 auto; }
  header { margin-bottom: 20px; }
  header h1 { font-size: 22px; margin: 0 0 4px; }
  header .date { color: #57606a; font-size: 14px; }
  .summary {
    border-radius: 10px; padding: 16px 18px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 12px; font-size: 15px;
  }
  .summary.ok { background: #dafbe1; color: #1a7f37; }
  .summary.warning { background: #fff8c5; color: #9a6700; }
  .summary.error { background: #ffebe9; color: #cf222e; }
  .card {
    background: #fff; border: 1px solid #d0d7de; border-radius: 10px;
    padding: 18px 20px; margin-bottom: 16px;
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .card-header h2 { font-size: 17px; margin: 0; }
  .badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .meta { color: #57606a; font-size: 12.5px; margin: 6px 0 12px; }
  .flags { background: #fff8c5; border: 1px solid #d4a72c33; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
  .flags-title { font-weight: 600; font-size: 13.5px; color: #7d5a00; margin-bottom: 4px; }
  .flags ul { margin: 4px 0 0; padding-left: 18px; font-size: 13.5px; color: #4d3800; }
  .notes-title { font-weight: 600; font-size: 13.5px; margin-bottom: 4px; color: #1f2328; }
  .notes { margin: 4px 0 0; padding-left: 18px; font-size: 14px; line-height: 1.5; }
  .notes-empty { color: #57606a; font-size: 13.5px; margin: 4px 0 0; }
  .raw-details { margin-top: 10px; font-size: 12.5px; color: #57606a; }
  .raw-details pre { white-space: pre-wrap; word-break: break-word; background: #f6f8fa; padding: 8px 10px; border-radius: 6px; margin-top: 6px; }
  footer { text-align: center; color: #8b949e; font-size: 12px; margin-top: 30px; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📋 Daily Supervisor Report</h1>
      <div class="date">${esc(dateStr)}</div>
    </header>
    <div class="summary ${summaryHealth}">
      ${summaryHealth === 'ok' ? '✅' : summaryHealth === 'warning' ? '⚠️' : '❌'} ${esc(summaryText)}
    </div>
    ${cardsHtml}
    <footer>Supervisor Agent sirf padhta aur report karta hai — koi bhi agent ka code ya data khud nahi badalta.</footer>
  </div>
</body>
</html>`;
}

module.exports = { generateReport };
