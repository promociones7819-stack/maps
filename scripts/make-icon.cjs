const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const resources = path.join(root, 'build');
const iconset = path.join(resources, 'icon.iconset');
const source = path.join(resources, 'app-icon.png');
fs.mkdirSync(iconset, { recursive: true });
execFileSync('swift', [path.join(__dirname, 'make-icon.swift'), source], { stdio: 'inherit' });

for (const [name, pixels] of [
  ['icon_16x16.png', 16], ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32], ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128], ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256], ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512], ['icon_512x512@2x.png', 1024],
]) {
  execFileSync('sips', ['-z', String(pixels), String(pixels), source, '--out', path.join(iconset, name)], { stdio: 'ignore' });
}
execFileSync('iconutil', ['-c', 'icns', '-o', path.join(resources, 'icon.icns'), iconset], { stdio: 'inherit' });
