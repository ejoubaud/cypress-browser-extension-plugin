const loadExtensions = require('../../index.js');
const path = require('path');

module.exports = (on, config) => {
  on('before:browser:launch', (browser = {}, args) => (
    loadExtensions(
      path.join(config.fixturesFolder, 'unpacked'),
      {
        source: path.join(config.fixturesFolder, 'unpacked'),
        alias: 'unpacked1',
      },
      {
        source: path.join(config.fixturesFolder, 'unpacked2'),
        alias: 'unpacked2',
      },
    )(browser, args)
  ));
};
