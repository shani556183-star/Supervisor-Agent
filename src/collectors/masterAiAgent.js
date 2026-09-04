'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { todayISO } = require('../lib/dateUtils');

function collect(agentConfig) {
  const base = agentConfig.localPath;
  const dbPath = path.join(base, 'data', 'db.sqlite');

  if (!fs.existsSync(dbPath)) {
    return {
      id: agentConfig.id,
      displayName: agentConfig.displayName,
      runsOn: agentConfig.runsOn,
      health: 'no_run',
      ranToday: false,
      lastActivity: null,
      notes: ['db.sqlite nahi mili.'],
      flags: [],
      errorSamples: [],
    };
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const today = todayISO();

  try {
    const eventsToday = db
      .prepare(`SELECT engine, action, result, created_at FROM system_events WHERE date(created_at) = ? ORDER BY created_at DESC`)
      .all(today);
    const errorsToday = db
      .prepare(`SELECT engine, category, message, created_at FROM errors WHERE date(created_at) = ? ORDER BY created_at DESC`)
      .all(today);
    const lastEventRow = db.prepare(`SELECT MAX(created_at) as t FROM system_events`).get();
    const lastErrorRow = db.prepare(`SELECT MAX(created_at) as t FROM errors`).get();

    let campaignsCompletedToday = 0;
    let campaignsStartedToday = 0;
    const actionCounts = {};
    for (const e of eventsToday) {
      actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
      if (e.action === 'campaign_completed') campaignsCompletedToday++;
      if (e.action === 'campaign_started' || e.action === 'campaign_created') campaignsStartedToday++;
    }

    const lastActivity = lastEventRow && lastEventRow.t ? lastEventRow.t : (lastErrorRow ? lastErrorRow.t : null);
    const ranToday = eventsToday.length > 0 || errorsToday.length > 0;

    const errorsByCategory = {};
    for (const e of errorsToday) {
      errorsByCategory[e.category] = (errorsByCategory[e.category] || 0) + 1;
    }

    const notes = [];
    if (ranToday) {
      notes.push(`Aaj ${eventsToday.length} system event(s) record hue.`);
      if (campaignsCompletedToday > 0) notes.push(`${campaignsCompletedToday} campaign(s) aaj complete hui.`);
      if (errorsToday.length > 0) {
        const catList = Object.entries(errorsByCategory).map(([c, n]) => `${c} (${n})`).join(', ');
        notes.push(`Aaj ${errorsToday.length} error(s) aaye: ${catList}.`);
      }
    } else {
      const lastDate = lastActivity ? lastActivity.slice(0, 10) : 'pata nahi';
      notes.push(`Aaj koi activity nahi hui. Last activity: ${lastDate}.`);
    }

    const flags = [];
    if (!ranToday) {
      flags.push({
        type: 'no_activity',
        severity: 'warning',
        message: `Ye agent aaj nahi chala. Last activity ${lastActivity ? lastActivity.slice(0, 10) : 'unknown'} ko thi — check karo scheduled task/service chal raha hai ya nahi.`,
      });
    }
    if (errorsToday.length > 5) {
      flags.push({
        type: 'high_error_count',
        severity: 'warning',
        message: `Aaj ${errorsToday.length} errors aaye, zyadatar category: ${Object.entries(errorsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'}.`,
      });
    }

    let health = 'ok';
    if (!ranToday) health = 'no_run';
    else if (errorsToday.length > 0) health = 'warning';

    return {
      id: agentConfig.id,
      displayName: agentConfig.displayName,
      runsOn: agentConfig.runsOn,
      health,
      ranToday,
      lastActivity,
      notes,
      flags,
      errorSamples: errorsToday.slice(0, 5).map((e) => `${e.created_at}: [${e.category}] ${e.message}`),
      context: { eventsToday: eventsToday.length, actionCounts },
    };
  } finally {
    db.close();
  }
}

module.exports = { collect };
