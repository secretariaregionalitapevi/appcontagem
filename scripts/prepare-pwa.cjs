const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function preparePwa(directory, version) {
  const walk = folder =>
    fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(folder, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    });
  const files = walk(directory)
    .filter(file => {
      const name = path.relative(directory, file).replace(/\\/g, '/');
      return (
        (/^(assets\/|_expo\/|icons\/)/.test(name) && !name.endsWith('.map')) ||
        ['index.html', 'manifest.json', 'icon.png', 'config.js', 'pwa-update.js'].includes(name)
      );
    })
    .sort();
  for (const name of ['index.html', 'pwa-update.js', 'config.js', 'manifest.json']) {
    if (!files.includes(path.join(directory, name))) throw new Error('PWA: missing ' + name);
  }
  const workerPath = path.join(directory, 'sw.js');
  const worker = fs.readFileSync(workerPath, 'utf8');
  if (!worker.includes('__PWA_ASSETS__')) throw new Error('PWA: service worker template missing');
  const hash = crypto.createHash('sha256').update(version).update(worker);
  for (const file of files)
    hash.update(path.relative(directory, file)).update(fs.readFileSync(file));
  const buildId = version + '-' + hash.digest('hex').slice(0, 16);
  const assets = files.map(file => '/' + path.relative(directory, file).replace(/\\/g, '/'));
  fs.writeFileSync(
    workerPath,
    worker
      .replaceAll('__PWA_BUILD_ID__', buildId)
      .replace(/(['"])__PWA_ASSETS__\1/, JSON.stringify(assets))
  );
  const client = path.join(directory, 'pwa-update.js');
  fs.writeFileSync(client, fs.readFileSync(client, 'utf8').replaceAll('__PWA_BUILD_ID__', buildId));
  fs.writeFileSync(path.join(directory, 'release.json'), JSON.stringify({ version, buildId }));
  console.log('PWA ' + buildId + ': ' + assets.length + ' offline assets');
  return { buildId, assets };
}
if (require.main === module)
  preparePwa(path.resolve(__dirname, '../dist'), require('../package.json').version);
module.exports = { preparePwa };
