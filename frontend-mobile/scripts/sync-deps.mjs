// After merging upstream, run `npm run sync-deps` so this package carries the
// same dependency versions the upstream data layer/components expect.
import fs from 'node:fs';
const up = JSON.parse(fs.readFileSync(new URL('../../frontend/package.json', import.meta.url)));
const file = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(file));
const changed = [];
for (const [name, ver] of Object.entries(up.dependencies || {})) {
  if (pkg.dependencies[name] !== ver) changed.push(`${name}: ${pkg.dependencies[name] ?? '(new)'} -> ${ver}`);
  pkg.dependencies[name] = ver;
}
for (const [name, ver] of Object.entries(up.devDependencies || {})) {
  if (name in pkg.devDependencies && pkg.devDependencies[name] !== ver) {
    changed.push(`${name}: ${pkg.devDependencies[name]} -> ${ver}`);
    pkg.devDependencies[name] = ver;
  }
}
pkg.overrides = up.overrides;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
console.log(changed.length ? changed.join('\n') : 'Dependencies already in sync.');
