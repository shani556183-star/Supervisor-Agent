'use strict';
const fs = require('fs');
const path = require('path');

const agentsConfig = require('./config/agents.json');
const businessOperator = require('./src/collectors/businessOperator');
const clientOutreach = require('./src/collectors/clientOutreach');
const masterAiAgent = require('./src/collectors/masterAiAgent');
const { generateReport } = require('./src/reportGenerator');
const { todayISO } = require('./src/lib/dateUtils');

const collectors = {
  businessOperator,
  clientOutreach,
  masterAiAgent,
};

function main() {
  const results = [];

  for (const agentConfig of agentsConfig.agents) {
    const collector = collectors[agentConfig.collector];
    if (!collector) {
      console.error(`No collector found for ${agentConfig.id}, skipping.`);
      continue;
    }
    try {
      const result = collector.collect(agentConfig);
      results.push(result);
      console.log(`[ok] ${agentConfig.displayName}: health=${result.health}, ranToday=${result.ranToday}, flags=${result.flags.length}`);
    } catch (err) {
      console.error(`[fail] ${agentConfig.displayName}: ${err.message}`);
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
  const html = generateReport(results, dateStr, { generatedAt: new Date(), isLive: false });

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const datedPath = path.join(reportsDir, `${dateStr}.html`);
  const latestPath = path.join(reportsDir, 'latest.html');
  fs.writeFileSync(datedPath, html, 'utf8');
  fs.writeFileSync(latestPath, html, 'utf8');

  console.log(`\nReport saved: ${datedPath}`);
  console.log(`Latest report: ${latestPath}`);
}

main();
