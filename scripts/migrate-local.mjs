import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
const built = JSON.parse(readFileSync(resolve(project, 'dist/server/wrangler.json'), 'utf8'));
if (!built.d1_databases?.some(database => database.binding === 'DB')) throw new Error('Build the D1-backed application first.');
mkdirSync(resolve(project, '.sites-runtime'), { recursive: true });
const config = resolve(project, '.sites-runtime/local-migrations.json');
writeFileSync(config, JSON.stringify({ name: 'dinner-tonight-local', compatibility_date: built.compatibility_date,
  d1_databases: built.d1_databases.map(database => ({ ...database, migrations_dir: resolve(project, 'drizzle') })) }));
const result = spawnSync(process.execPath, ['--import', new URL('./sites-env.mjs', import.meta.url).href,
  resolve(project, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'migrations', 'apply', 'DB', '--local',
  '--config', config, '--persist-to', resolve(project, '.wrangler/state')],
  { cwd: project, input: 'y\n', stdio: ['pipe', 'inherit', 'inherit'], env: { ...process.env, CI: 'true' } });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
