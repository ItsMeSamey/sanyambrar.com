import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const localZig = resolve(homedir(), '.local/share/zig/0.17.0/zig');
const zig = process.env.ZIG ?? (existsSync(localZig) ? localZig : 'zig');
const version = spawnSync(zig, ['version'], { encoding: 'utf8' });
if (version.error) throw version.error;
if (version.status !== 0 || version.stdout.trim() !== '0.17.0') throw new Error('Project engines require the pinned Zig 0.17.0 compiler. Set ZIG to its executable.');
const result = spawnSync(zig, [
  'build-exe', '-target', 'wasm32-freestanding', '-O', 'ReleaseSmall',
  '-fno-entry', '-rdynamic', '--export-memory',
  '--dep', 'html', '--dep', 'oneserial', '-Mroot=src/site/demos/zig/demo.zig',
  '--dep', 'config', '-Mhtml=src/site/demos/zig/vendor/zhtml/root.zig',
  '-Moneserial=src/site/demos/zig/vendor/oneserial/root.zig',
  '-Mconfig=src/site/demos/zig/config.zig',
  '-femit-bin=src/site/demos/assets/project-engines.wasm',
  '--cache-dir', '.tmp/zig-demo-cache',
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
