import { spawnSync } from 'node:child_process';
import { readdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
for (const directory of ['dist', 'dist/lib', 'bin', 'scripts', 'test']) {
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', join(directory, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
const html = await readFile('dist/index.html', 'utf8');
for (const [, path] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await access(join('dist', path));
console.log('JavaScript syntax and local entrypoint assets verified.');
