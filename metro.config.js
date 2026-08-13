// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// colyseus.js pulls in @colyseus/httpie, whose package.json "exports" map resolves
// to a Node-only build (using the `https`/`http` core modules) when Metro follows
// modern package-exports conditions. Disabling strict exports resolution makes Metro
// fall back to httpie's legacy `"browser"` field instead, which correctly points to
// its XHR-based implementation — safe for both React Native and web.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
