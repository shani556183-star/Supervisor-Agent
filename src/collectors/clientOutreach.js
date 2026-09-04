'use strict';
const fs = require('fs');
const path = require('path');
const { tailLines } = require('../lib/tailReader');
const { isToday, todayUS } = require('../lib/dateUtils');

const ERROR_RE = /\b(error|exception|failed|failure|refused|traceback|econnreset|etimedout|enotfound)\b/i;
const SUCCESS_RE = /\b(done|success|synced|completed|committed|pushed)\b/i;
const BANNER_RE = /^===.*?(\d{2}\/\d{2}\/\d{4}).*?===\s*$/;

// These are expected to produce activity every day (scheduled tasks / always-on
// services). If their log file wasn't touched today, that itself is worth flagging.
const CORE_LOGS = [
  'github_backup.log',
  'lead_send_run.log',
  'prospecting_service.log',
  'backlink_scraping_service.log',
  'lead_contact_retry_service.log',
];

function todaySectionFromBanners(lines) {
  const us = todayUS();
  let lastTodayIdx = -1;
  lines.forEach((line, i) => {
    const m = line.match(BANNER_RE);
    if (m && m[1] === us) lastTodayIdx = i;
  });
  if (lastTodayIdx === -1) return null;
  return lines.slice(lastTodayIdx);
}

function summarizeFile(filePath, fileName) {
  const stat = fs.statSync(filePath);
  const modifiedToday = isToday(stat.mtime);
  if (!modifiedToday) {
    return { fileName, modifiedToday: false, lastModified: stat.mtime.toISOString() };
  }

  const { lines } = tailLines(filePath, 300 * 1024);
  const bannerSection = todaySectionFromBanners(lines);
  const section = bannerSection || lines; // fall back to tail chunk for streaming logs

  const nonEmpty = section.filter((l) => l.trim().length > 0);
  const errorLines = nonEmpty.filter((l) => ERROR_RE.test(l));
  const successLines = nonEmpty.filter((l) => SUCCESS_RE.test(l));

  return {
    fileName,
    modifiedToday: true,
    lastModified: stat.mtime.toISOString(),
    lineCount: nonEmpty.length,
    errorCount: errorLines.length,
    successCount: successLines.length,
    errorSamples: errorLines.slice(-3),
    sendingDisabled: /sending is currently OFF/i.test(nonEmpty.join('\n')),
    backupPushed: fileName === 'github_backup.log' ? /Backup committed and pushed/i.test(nonEmpty.join('\n')) : undefined,
  };
}

function collect(agentConfig) {
  const base = agentConfig.localPath;
  const logsDir = path.join(base, 'logs');

  if (!fs.existsSync(logsDir)) {
    return {
      id: agentConfig.id,
      displayName: agentConfig.displayName,
      runsOn: agentConfig.runsOn,
      health: 'no_run',
      ranToday: false,
      lastActivity: null,
      notes: ['logs/ folder nahi mila.'],
      flags: [],
      errorSamples: [],
    };
  }

  const files = fs
    .readdirSync(logsDir)
    .filter((f) => f.toLowerCase().endsWith('.log'));

  const summaries = files.map((f) => summarizeFile(path.join(logsDir, f), f));
  const ranTodayFiles = summaries.filter((s) => s.modifiedToday);
  const ranToday = ranTodayFiles.length > 0;

  const notes = [];
  const flags = [];
  const errorSamples = [];

  for (const s of summaries) {
    if (!s.modifiedToday) continue;
    if (s.fileName === 'lead_send_run.log') {
      if (s.sendingDisabled) {
        notes.push('Outreach sending abhi OFF hai (config setting) — koi email/message nahi bheja gaya aaj, ye jaan-boojh kar band kiya hua lagta hai.');
      } else if (s.errorCount > 0) {
        notes.push(`Aaj outreach bhejne ki koshish hui, lekin ${s.errorCount} jagah error aaya.`);
      } else if (s.successCount > 0) {
        notes.push('Aaj outreach messages successfully bheje gaye.');
      }
    } else if (s.fileName === 'github_backup.log') {
      if (s.backupPushed) {
        notes.push('Aaj ka data backup GitHub par successfully save ho gaya.');
      } else {
        flags.push({ type: 'backup_incomplete', severity: 'warning', message: 'Aaj backup start hua lekin "pushed" confirmation nahi mila — backup adhura reh sakta hai.' });
      }
    } else if (['prospecting_service.log', 'backlink_scraping_service.log', 'lead_contact_retry_service.log'].includes(s.fileName)) {
      notes.push(`${s.fileName}: chal raha hai (background service), aaj ${s.errorCount} error, ${s.successCount} success sign mile.`);
    }

    if (s.errorCount > 3) {
      flags.push({
        type: 'log_errors',
        severity: 'warning',
        message: `${s.fileName} mein aaj ${s.errorCount} error jaisi lines mili.`,
      });
    }
    errorSamples.push(...s.errorSamples.map((l) => `[${s.fileName}] ${l.trim()}`));
  }

  for (const coreFile of CORE_LOGS) {
    const s = summaries.find((x) => x.fileName === coreFile);
    if (!s || !s.modifiedToday) {
      const lastMod = s ? s.lastModified.slice(0, 10) : 'kabhi nahi mili';
      flags.push({
        type: 'no_activity',
        severity: 'warning',
        message: `${coreFile} aaj update nahi hui (last activity: ${lastMod}) — ho sakta hai ye scheduled task aaj chala hi nahi.`,
      });
    }
  }

  let health = 'ok';
  if (!ranToday) health = 'no_run';
  else if (flags.some((f) => f.severity === 'warning')) health = 'warning';

  const lastActivityFile = summaries
    .filter((s) => s.lastModified)
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0];

  return {
    id: agentConfig.id,
    displayName: agentConfig.displayName,
    runsOn: agentConfig.runsOn,
    health,
    ranToday,
    lastActivity: lastActivityFile ? lastActivityFile.lastModified : null,
    notes,
    flags,
    errorSamples: errorSamples.slice(0, 5),
    context: { filesCheckedToday: ranTodayFiles.map((s) => s.fileName) },
  };
}

module.exports = { collect };
