const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The emergency domain layer is shared with the Civilian app, but it lives
// outside this Expo project's directory. Metro otherwise blocks that import
// during a production bundle.
config.watchFolders = [path.resolve(__dirname, '..', 'backend')];

module.exports = config;
