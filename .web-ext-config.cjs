const path = require('path');

module.exports = {
  sourceDir: 'dist/firefox',
  run: {
    firefox: 'D:\\Program Files\\Zen Browser\\zen.exe',
    firefoxProfile: path.resolve(__dirname, '.zen-dev-profile'),
    keepProfileChanges: true,
  },
};
