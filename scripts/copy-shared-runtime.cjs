const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'shared', 'dist');
const targetDir = path.join(root, 'dist', 'node_modules', '@tia', 'shared');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Shared build output not found: ${sourceDir}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

fs.writeFileSync(
  path.join(targetDir, 'package.json'),
  JSON.stringify(
    {
      name: '@tia/shared',
      version: '0.0.2',
      main: './index.js',
      types: './index.d.ts',
    },
    null,
    2,
  ),
);

console.log(`[build] Copied @tia/shared runtime package to ${targetDir}`);
