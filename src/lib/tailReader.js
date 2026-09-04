'use strict';
const fs = require('fs');

// Reads only the last `maxBytes` of a file (files here can be 50MB+ raw
// dumps) and returns it split into lines. Never loads the whole file.
function tailLines(filePath, maxBytes = 300 * 1024) {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const start = Math.max(0, size - maxBytes);
  const fd = fs.openSync(filePath, 'r');
  const length = size - start;
  const buffer = Buffer.alloc(length);
  fs.readSync(fd, buffer, 0, length, start);
  fs.closeSync(fd);
  let text = buffer.toString('utf8');
  if (start > 0) {
    // Drop the first (likely partial) line since we started mid-file.
    const firstNewline = text.indexOf('\n');
    text = firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
  }
  return { lines: text.split(/\r?\n/), truncated: start > 0, mtime: stat.mtime, size };
}

module.exports = { tailLines };
