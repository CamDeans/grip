// Custom process polyfill to avoid Babel issues
// This is a simplified version of process/browser.js

// Define process
const process = {
  env: {},
  nextTick: function nextTick(fn) {
    setTimeout(fn, 0);
  },
  version: '',
  versions: {},
  platform: 'browser',
  browser: true,
  title: 'browser',
  argv: [],
  on: function() {},
  addListener: function() {},
  once: function() {},
  off: function() {},
  removeListener: function() {},
  removeAllListeners: function() {},
  emit: function() {},
  binding: function() {
    throw new Error('process.binding is not supported');
  },
  cwd: function() { return '/' },
  chdir: function() {
    throw new Error('process.chdir is not supported');
  },
  umask: function() { return 0; },
  hrtime: function() { return [0, 0]; },
  uptime: function() { return 0; }
};

module.exports = process; 