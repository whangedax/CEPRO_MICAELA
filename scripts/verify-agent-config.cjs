#!/usr/bin/env node
// Read-only by default. No dependencies, network, shell commands or product data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const skillRoot = path.join(root, '.agents', 'skills');
const lockPath = path.join(root, '.agents', 'skills-lock.json');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const vendorNames = ['frontend-design', 'ui-ux-pro-max', 'web-design-guidelines',
  'tailwind', 'electron', 'sql-database-assistant', 'typescript-pro', 'vercel-react-best-practices'];
const roles = {
  'cepro-orquestador': 'cepro-orquestacion',
  'cepro-explorador': 'cepro-exploracion',
  'cepro-disenador-ui': 'cepro-ui-design',
  'cepro-arquitecto': 'cepro-arquitectura',
  'cepro-implementador': 'cepro-implementacion',
  'cepro-auditor': 'cepro-auditoria',
  'cepro-documentador': 'cepro-memoria',
};

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) return [];
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symbolic link: ${full}`);
    return entry.isDirectory() ? walk(full) : [full];
  }).sort();
}

// Only checks the simple fields used here; not a general YAML parser.
function frontmatter(file) {
  const text = read(file).replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  check(Boolean(match), `Missing frontmatter: ${file}`);
  return { text, header: match?.[1] || '', body: match ? text.slice(match[0].length) : '' };
}
function scalar(header, key) {
  return header.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}
function list(header, key) {
  const block = header.match(new RegExp(`^${key}:\\s*\\n((?:[ \\t]+- .*(?:\\n|$))+)`, 'm'))?.[1] || '';
  return [...block.matchAll(/^\s+- (.+)$/gm)].map((match) => match[1].trim());
}

function validate() {
  for (const file of ['AGENTS.md', 'docs/cerebro-proyecto/INDICE_ACTIVO.md',
    'docs/ORQUESTACION_LOCAL.md', 'docs/UI_ARCHITECTURE.md', 'docs/design/BRIEF.md',
    '.agents/workflows/cepro-desarrollar.md', 'scripts/search-ui-design.ps1']) {
    check(fs.existsSync(path.join(root, file)), `Missing entrypoint: ${file}`);
  }
  const index = path.join(root, 'docs/cerebro-proyecto/INDICE_ACTIVO.md');
  if (fs.existsSync(index)) check(read(index).split(/\r?\n/).length < 65, 'Active index must stay under 65 lines');
  for (const [role, skill] of Object.entries(roles)) {
    const file = path.join(root, '.agents', 'agents', `${role}.md`);
    if (!fs.existsSync(file)) { check(false, `Missing agent: ${role}`); continue; }
    const { header, body } = frontmatter(file);
    check(scalar(header, 'name') === role, `Agent name mismatch: ${role}`);
    check(Boolean(scalar(header, 'description')), `Missing description: ${role}`);
    check(['inherit', 'flash', 'pro'].includes(scalar(header, 'model')), `Invalid model: ${role}`);
    check(scalar(header, 'commandExecutionPolicy') === 'sandbox', `Missing sandbox policy: ${role}`);
    const coordinator = role === 'cepro-orquestador';
    check(scalar(header, 'mainAgent') === String(coordinator), `mainAgent mismatch: ${role}`);
    check(scalar(header, 'subagent') === String(!coordinator), `subagent mismatch: ${role}`);
    const skills = list(header, 'skills');
    for (const required of ['token-saver', skill]) {
      check(skills.includes(`.agents/skills/${required}`), `Missing required skill ${required}: ${role}`);
    }
    for (const ref of skills) {
      check(ref.startsWith('.agents/skills/'), `Non-project skill reference: ${role}: ${ref}`);
      check(fs.existsSync(path.join(root, ref, 'SKILL.md')), `Broken skill path: ${role}: ${ref}`);
    }
    for (const field of ['skills_obligatorias', 'skills_condicionales', 'entradas',
      'salidas', 'archivos_permitidos', 'criterio_de_cierre']) {
      check(body.includes(`${field}:`), `Missing contract ${field}: ${role}`);
    }
    const tools = list(header, 'tools');
    const knownTools = ['view_file', 'grep_search', 'run_command', 'replace_file_content', 'invoke_subagent'];
    check(tools.every((tool) => knownTools.includes(tool)), `Unknown tool: ${role}`);
    if (!coordinator) check(!tools.includes('invoke_subagent'), `Recursive delegation enabled: ${role}`);
    if (['cepro-explorador', 'cepro-arquitecto', 'cepro-auditor'].includes(role)) {
      check(!tools.includes('replace_file_content'), `Editing tool on read-only agent: ${role}`);
    }
  }
  const directories = fs.readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const entry of directories) {
    const file = path.join(skillRoot, entry.name, 'SKILL.md');
    if (!fs.existsSync(file)) { check(false, `Missing SKILL.md: ${entry.name}`); continue; }
    const { header } = frontmatter(file);
    check(scalar(header, 'name') === entry.name, `Skill name mismatch: ${entry.name}`);
    check(Boolean(scalar(header, 'description')), `Missing skill description: ${entry.name}`);
  }
  for (const name of vendorNames) check(fs.existsSync(path.join(skillRoot, name, 'SKILL.md')), `Missing vendor skill: ${name}`);
  for (const entry of fs.readdirSync(path.join(root, '.agents', 'rules'))) {
    const { header } = frontmatter(path.join(root, '.agents', 'rules', entry));
    check(scalar(header, 'trigger') === 'model_decision', `Invalid rule trigger: ${entry}`);
    check(Boolean(scalar(header, 'description')), `Missing rule description: ${entry}`);
  }
  for (const relative of ['ui-ux-pro-max/scripts/search.py', 'ui-ux-pro-max/data/typography.csv',
    'web-design-guidelines/references/command.md', 'web-design-guidelines/references/source.json',
    'frontend-design/LICENSE.txt', 'ui-ux-pro-max/LICENSE']) {
    check(fs.existsSync(path.join(skillRoot, relative)), `Missing skill resource: ${relative}`);
  }
  return directories.length;
}

function inventory(name) {
  return Object.fromEntries(walk(path.join(skillRoot, name)).map((file) => [
    path.relative(path.join(skillRoot, name), file).split(path.sep).join('/'), sha(file),
  ]));
}

try {
  const count = validate();
  if (process.argv.includes('--write-lock')) {
    if (failures.length) throw new Error('Resolve configuration errors before writing lock');
    const upstream = JSON.parse(read(path.join(skillRoot, 'upstream-lock.json')));
    const previous = fs.existsSync(lockPath) ? JSON.parse(read(lockPath)) : { skills: [] };
    const skills = vendorNames.map((name) => {
      const source = upstream.find((item) => item.name === name);
      const old = previous.skills.find((item) => item.name === name);
      const origin = source ? { kind: 'github', ...source } : {
        kind: 'local-snapshot', location: `~/.agents/skills/${name === 'typescript-pro' ? 'typescript-pro/typescript-pro' : name}`,
      };
      return { name, origin, adaptations: old?.adaptations || [], files: inventory(name) };
    });
    const lock = { schemaVersion: 1, skills };
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    console.log(`Lock written: ${skills.length} third-party skills`);
  } else {
    check(fs.existsSync(lockPath), 'Missing skills-lock.json');
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(read(lockPath));
      check(lock.schemaVersion === 1 && Array.isArray(lock.skills), 'Invalid lock schema');
      check(lock.skills?.length === vendorNames.length, 'Lock skill count mismatch');
      for (const name of vendorNames) {
        const locked = lock.skills?.find((item) => item.name === name);
        check(Boolean(locked), `Skill absent from lock: ${name}`);
        if (!locked || !fs.existsSync(path.join(skillRoot, name))) continue;
        if (locked.origin.kind === 'github') check(/^[a-f0-9]{40}$/.test(locked.origin.commit), `Invalid pinned commit: ${name}`);
        const actual = inventory(name);
        check(JSON.stringify(actual) === JSON.stringify(locked.files), `Third-party files changed: ${name}`);
      }
    }
  }
  if (failures.length) {
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  } else console.log(`PASS: 7 agents, ${count} skills, rules, paths and ${process.argv.includes('--write-lock') ? 'lock generated' : 'third-party hashes'}`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
}
