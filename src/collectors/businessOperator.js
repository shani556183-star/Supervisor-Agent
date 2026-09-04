'use strict';
const fs = require('fs');
const path = require('path');
const { isToday } = require('../lib/dateUtils');

function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
}

// Log lines look like: 2026-09-02T08:18:29.838614 | DAILY_SCAN | processed=6 skipped_no_findings=0 errors=2
function parsePipeLine(line) {
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length < 2) return null;
  const [timestamp, eventType, ...rest] = parts;
  return { timestamp, eventType, rest: rest.join(' | ') };
}

function collect(agentConfig) {
  const base = agentConfig.localPath;
  const logsDir = path.join(base, 'logs');

  const daily = readLines(path.join(logsDir, 'daily.log')).map(parsePipeLine).filter(Boolean);
  const errors = readLines(path.join(logsDir, 'errors.log')).map(parsePipeLine).filter(Boolean);
  const decisions = readLines(path.join(logsDir, 'decisions.log')).map(parsePipeLine).filter(Boolean);
  const approvals = readLines(path.join(logsDir, 'approvals.log')).map(parsePipeLine).filter(Boolean);

  const dailyToday = daily.filter((e) => isToday(e.timestamp));
  const errorsToday = errors.filter((e) => isToday(e.timestamp));
  const decisionsToday = decisions.filter((e) => isToday(e.timestamp));
  const approvalsToday = approvals.filter((e) => isToday(e.timestamp));

  // Pending approvals = REQUESTED entries (any date) with no later APPROVED/REJECTED
  // for the same outreach id. This is the "flag for human, never auto-decide" list.
  const pendingApprovals = [];
  const resolvedIds = new Set();
  for (const a of approvals) {
    if (a.eventType === 'APPROVED' || a.eventType === 'REJECTED') {
      const idMatch = a.rest.match(/outreach_id=(\S+)/);
      if (idMatch) resolvedIds.add(idMatch[1]);
    }
  }
  for (const a of approvals) {
    if (a.eventType === 'REQUESTED') {
      const idMatch = a.rest.match(/^send_outreach \| (\S+)/);
      const id = idMatch ? idMatch[1] : null;
      if (id && !resolvedIds.has(id)) {
        pendingApprovals.push({ id, timestamp: a.timestamp, detail: a.rest });
      }
    }
  }

  const lastEntry = [...daily, ...errors, ...decisions, ...approvals]
    .filter((e) => e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const lastActivity = lastEntry ? lastEntry.timestamp : null;

  const statusMdPath = path.join(base, 'BUSINESS_STATUS.md');
  let statusSnippet = null;
  if (fs.existsSync(statusMdPath)) {
    const content = fs.readFileSync(statusMdPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const updatedLine = lines.find((l) => l.toLowerCase().startsWith('last updated'));
    const expLine = lines.find((l) => l.toLowerCase().includes('opportunity:'));
    const statusLine = lines.find((l) => l.toLowerCase().includes('status:'));
    statusSnippet = {
      lastUpdated: updatedLine ? updatedLine.replace(/^last updated:\s*/i, '').trim() : null,
      opportunity: expLine ? expLine.replace(/^-\s*opportunity:\s*/i, '').trim() : null,
      status: statusLine ? statusLine.replace(/^-\s*status:\s*/i, '').trim() : null,
    };
  }

  const ranToday = dailyToday.length > 0 || errorsToday.length > 0 || approvalsToday.length > 0;

  let health = 'ok';
  if (!ranToday) health = 'no_run';
  else if (errorsToday.length > 0) health = 'warning';

  const notes = [];
  if (dailyToday.length > 0) {
    const totals = dailyToday.reduce(
      (acc, e) => {
        const m = e.rest.match(/processed=(\d+).*?errors=(\d+)/);
        if (m) {
          acc.processed += Number(m[1]);
          acc.errors += Number(m[2]);
        }
        return acc;
      },
      { processed: 0, errors: 0 }
    );
    notes.push(`Aaj ${dailyToday.length} scan run(s) hue, total ${totals.processed} site(s) process hui, ${totals.errors} error mile.`);
  }
  if (errorsToday.length > 0) {
    notes.push(`Aaj ${errorsToday.length} error(s) aaye (zyadatar website fetch fail hone ki wajah se — jaise site down ya blocked).`);
  }
  if (pendingApprovals.length > 0) {
    notes.push(`${pendingApprovals.length} outreach message(s) tumhari approval ka intezaar kar rahe hain — koi bhi khud se nahi bheja gaya.`);
  }
  if (decisionsToday.length > 0) {
    notes.push(`Aaj ${decisionsToday.length} naya decision/note record hua.`);
  }
  if (!ranToday) {
    notes.push('Aaj is agent ki koi activity nahi mili (GitHub Actions schedule check karo, ho sakta hai run hi nahi hua).');
  }

  return {
    id: agentConfig.id,
    displayName: agentConfig.displayName,
    runsOn: agentConfig.runsOn,
    health,
    ranToday,
    lastActivity,
    notes,
    flags: pendingApprovals.map((p) => ({
      type: 'pending_approval',
      severity: 'action_needed',
      message: `Approval pending: ${p.detail} (id ${p.id}, requested ${p.timestamp})`,
    })),
    errorSamples: errorsToday.slice(0, 5).map((e) => `${e.timestamp}: ${e.rest}`),
    context: statusSnippet,
  };
}

module.exports = { collect };
