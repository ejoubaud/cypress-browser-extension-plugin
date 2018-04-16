const loadExtension = require('../../index.js');
const path = require('path');

module.exports = (on, config) => {
  on('before:browser:launch', loadExtension(path.join(config.fixturesFolder, 'unpacked')));
};
