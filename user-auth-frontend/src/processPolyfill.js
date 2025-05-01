// This is a polyfill for the process object in the browser
window.process = window.process || {
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  browser: true,
  version: '',
  versions: {},
  nextTick: function(cb) {
    setTimeout(cb, 0);
  },
  title: 'browser',
  argv: [],
  on: function() {},
  addListener: function() {},
  once: function() {},
  off: function() {},
  removeListener: function() {},
  removeAllListeners: function() {},
  emit: function() {},
  prependListener: function() {},
  prependOnceListener: function() {},
  listeners: function() { return []; },
  binding: function() { throw new Error('process.binding is not supported'); },
  cwd: function() { return '/'; },
  chdir: function() { throw new Error('process.chdir is not supported'); },
  umask: function() { return 0; }
};

export default window.process;
