const extensionLoader = require('../../loader.js');
const path = require('path');

module.exports = (on, config) => {
  on('before:browser:launch', (browser = {}, args) => (
    extensionLoader.load(
      path.join(config.fixturesFolder, 'unpacked'), {
        source: path.join(config.fixturesFolder, 'unpacked'),
        alias: 'unpacked1',
      }, {
        source: path.join(config.fixturesFolder, 'unpacked2'),
        alias: 'unpacked2',
      }, {
        source: path.join(config.fixturesFolder, 'unpacked'),
        alias: 'hookless',
        skipHooks: true,
      }, {
        source: path.join(config.fixturesFolder, 'crxpacked.crx'),
        alias: 'crxpacked',
      },
    )(browser, args)
  ));
};
