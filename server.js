'use strict';
// Tiny local-only dashboard server. On every page load (including a plain
// browser Refresh) it re-reads all 3 agents fresh and renders a new page —
// so the "Refresh" button never needs the .bat to run again.
const http = require('http');
const fs = require('fs');
const path = require('path');

const agentsConfig = require('./config/agents.json');
const businessOperator = require('./src/collectors/businessOperator');
const clientOutreach = require('./src/collectors/clientOutreach');
const masterAiAgent = require('./src/collectors/masterAiAgent');
const { generateReport } = require('./src/reportGenerator');
const { todayISO } = require('./src/lib/dateUtils');

const PORT = 47983;
const HOST = '127.0.0.1';

const collectors = { businessOperator, clientOutreach, masterAiAgent };

function buildDashboard() {
  const results = [];
  for (const agentConfig of agentsConfig.agents) {
    const collector = collectors[agentConfig.collector];
    if (!collector) continue;
    try {
      results.push(collector.collect(agentConfig));
    } catch (err) {
      results.push({
        id: agentConfig.id,
        displayName: agentConfig.displayName,
        runsOn: agentConfig.runsOn,
        health: 'error',
        ranToday: false,
        lastActivity: null,
        notes: [],
        flags: [{ type: 'collector_error', severity: 'warning', message: `Supervisor is agent ko read nahi kar saka: ${err.message}` }],
        errorSamples: [],
      });
    }
  }

  const dateStr = todayISO();
  const generatedAt = new Date();
  const html = generateReport(results, dateStr, { generatedAt, isLive: true });

  // Keep the same on-disk archive fresh too, so the .bat / scheduled task
  // and the live server always agree.
  try {
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, `${dateStr}.html`), html, 'utf8');
    fs.writeFileSync(path.join(reportsDir, 'latest.html'), html, 'utf8');
  } catch (e) {
    console.error('Could not write report archive:', e.message);
  }

  return html;
}

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const html = buildDashboard();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Supervisor dashboard build karne mein masla hua: ${err.message}`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // A server from an earlier double-click is already running and serving
    // fine — nothing to do, just exit quietly.
    process.exit(0);
  }
  console.error('Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Supervisor dashboard running at http://${HOST}:${PORT}/`);
});
