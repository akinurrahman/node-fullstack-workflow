// Usage: node scripts/check-skill-coverage.mjs <baseline commit> [--allow <allowlist.md>] [--replaced <replaced.md>] <file>...
// Baseline: the given files as they were at <baseline commit> (files missing there are skipped).
// Forward: every unit of the baseline exists in the files now, or is declared replaced.
// Reverse: every unit of the files now exists in the baseline or the allowlist.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opts = { allow: null, replaced: null };
const files = [];
let commit = null;
for (let i = 0; i < args.length; i++) {
  const flag = args[i].match(/^--(allow|replaced)$/);
  if (flag) opts[flag[1]] = args[++i];
  else if (!commit) commit = args[i];
  else files.push(args[i]);
}
if (!commit || !files.length) {
  console.error('usage: check-skill-coverage.mjs <baseline commit> [--allow <file>] [--replaced <file>] <file>...');
  process.exit(2);
}

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

function units(text) {
  const out = [];
  const lines = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    out.push('FRONTMATTER: ' + collapse(lines.slice(0, end + 1).join('\n')));
    i = end + 1;
  }
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const joined = collapse(para.join(' '));
    para = [];
    for (let s of joined.split(/(?<=[.!?](?:\*\*)?)\s+(?=[A-Z`*(\[])/)) {
      s = s.replace(/:$/, '.');
      if (s) out.push(s);
    }
  };
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flush();
      const body = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) body.push(lines[i]);
      out.push('CODE: ' + collapse(body.join('\n')));
      continue;
    }
    if (/^#{1,6} /.test(line)) {
      flush();
      out.push('H: ' + line.replace(/^#+ /, '').trim());
      continue;
    }
    if (/^\s*\|/.test(line)) {
      flush();
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue;
      out.push('ROW: ' + line.trim().replace(/^\||\|$/g, '').split('|').map(collapse).join(' | '));
      continue;
    }
    if (/^\s*$/.test(line) || /^---\s*$/.test(line)) {
      flush();
      continue;
    }
    const item = line.match(/^\s*(?:- |\d+\. )(.*)$/);
    if (item) {
      flush();
      para.push(item[1]);
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}

function atCommit(file) {
  try {
    return execFileSync('git', ['show', `${commit}:./${file.replace(/\\/g, '/')}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

const baseline = [];
const inBaseline = [];
for (const f of files) {
  const text = atCommit(f);
  if (text === null) continue;
  inBaseline.push(f);
  baseline.push(...units(text));
}
const fresh = [];
for (const f of files) for (const u of units(readFileSync(f, 'utf8'))) fresh.push({ f, u });
const allow = new Set(opts.allow ? units(readFileSync(opts.allow, 'utf8')) : []);
const replaced = new Set(opts.replaced ? units(readFileSync(opts.replaced, 'utf8')) : []);

const freshSet = new Set(fresh.map((x) => x.u));
const baseSet = new Set(baseline);
const missing = baseline.filter((u) => !freshSet.has(u) && !replaced.has(u));
const added = fresh.filter((x) => !baseSet.has(x.u) && !allow.has(x.u));
const unusedAllow = [...allow].filter((u) => !freshSet.has(u));
const unusedReplaced = [...replaced].filter((u) => !baseSet.has(u) || freshSet.has(u));

console.log(`baseline: ${commit} (${inBaseline.join(', ') || 'no files'})`);
console.log(`files checked: ${files.join(', ')}`);
console.log(`baseline units: ${baseline.length}, new units: ${fresh.length}, allowlisted: ${allow.size}`);
console.log(`declared replaced (baseline units reworded on purpose): ${replaced.size}`);
for (const u of replaced) console.log('  REPLACED  ' + u);
console.log(`forward (baseline unit missing from new files): ${missing.length}`);
for (const u of missing) console.log('  MISSING  ' + u);
console.log(`reverse (new unit not in baseline or allowlist): ${added.length}`);
for (const x of added) console.log(`  NEW  [${x.f}] ${x.u}`);
console.log(`allowlist entries not used: ${unusedAllow.length}`);
for (const u of unusedAllow) console.log('  UNUSED  ' + u);
console.log(`replaced entries not removed from the baseline: ${unusedReplaced.length}`);
for (const u of unusedReplaced) console.log('  UNUSED  ' + u);
process.exit(missing.length || added.length ? 1 : 0);
