/**
 * MongoDB Browser Polyfill for G.R.I.P.
 * This file provides polyfills for Node.js specific functions that MongoDB might try to use in browser
 */

// Self-executing function to avoid polluting global scope
(function() {
  if (typeof window !== 'undefined') {
    // Define process if it doesn't exist
    if (!window.process) {
      window.process = {};
    }
    
    // Define global if it doesn't exist
    if (!window.global) {
      window.global = window;
    }
    
    // Complete process object with all needed functions
    if (!window.process.emitWarning) {
      window.process.emitWarning = function(warning, options) {
        console.warn('[MongoDB Warning Polyfill]:', warning, options);
      };
    }
    
    if (!window.process.env) {
      window.process.env = {};
    }
    
    // Define Buffer if it doesn't exist (MongoDB often uses this)
    if (!window.Buffer) {
      window.Buffer = {
        isBuffer: function(obj) { return false; },
        from: function(data, encoding) { return data; },
        alloc: function(size) { return new Uint8Array(size); }
      };
    }
    
    // Fix any issues with global.process
    if (!global.process) {
      global.process = window.process;
    }
    
    if (!global.process.emitWarning) {
      global.process.emitWarning = window.process.emitWarning;
    }
    
    if (!global.Buffer) {
      global.Buffer = window.Buffer;
    }
    
    console.log('MongoDB browser polyfill loaded and applied');
  }
})();

// Export a function that can be used to check if we're in a browser
export const isBrowser = () => typeof window !== 'undefined';
