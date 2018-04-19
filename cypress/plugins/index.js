const loadExtension = require('../../index.js');
const path = require('path');

module.exports = (on, config) => {
  on('before:browser:launch', (browser = {}, args) => {
    loadExtension(path.join(config.fixturesFolder, 'unpacked'))(browser, args);
    loadExtension({
      source: path.join(config.fixturesFolder, 'unpacked'),
      alias: 'unpacked1',
    })(browser, args);
    return loadExtension({
      source: path.join(config.fixturesFolder, 'unpacked2'),
      alias: 'unpacked2',
    })(browser, args);
  });
};
