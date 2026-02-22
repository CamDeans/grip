/**
 * G.R.I.P. Global Polyfills
 * 
 * This file contains polyfills for Node.js specific APIs
 * that might be used by MongoDB or other libraries in the browser.
 * 
 * This file should be imported as early as possible in the application.
 */

// Self-executing function to avoid polluting global scope
(function() {
  if (typeof window !== 'undefined') {
    // Suppress known third-party deprecation noise (e.g. zustand default export from instrumentation/deps)
    var originalWarn = console.warn;
    console.warn = function() {
      var msg = arguments[0] != null ? String(arguments[0]) : '';
      if (msg.indexOf('[DEPRECATED] Default export is deprecated') !== -1 && msg.indexOf('zustand') !== -1) {
        return;
      }
      return originalWarn.apply(console, arguments);
    };

    // Define process if it doesn't exist
    if (!window.process) {
      window.process = {};
    }
    
    // Define global if it doesn't exist
    if (!window.global) {
      window.global = window;
    }

    // Enhanced polyfill for emitWarning that's more robust
    // and handles different call patterns
    if (!window.process.emitWarning) {
      window.process.emitWarning = function(warning, options) {
        // Handle different argument patterns
        if (typeof warning === 'object' && warning !== null) {
          if (warning.message) {
            console.warn('[GRIP Polyfill Warning]:', warning.message, options);
          } else {
            console.warn('[GRIP Polyfill Warning]:', warning, options);
          }
        } else {
          console.warn('[GRIP Polyfill Warning]:', warning, options);
        }
        
        // Return undefined to match Node.js behavior
        return undefined;
      };
    }
    
    if (!window.process.env) {
      window.process.env = {};
    }
    
    if (!window.process.nextTick) {
      window.process.nextTick = function(callback) {
        setTimeout(callback, 0);
      };
    }
    
    // Buffer is used extensively by MongoDB
    if (!window.Buffer) {
      window.Buffer = {
        isBuffer: function(obj) { return false; },
        from: function(data, encoding) { return data; },
        alloc: function(size) { return new Uint8Array(size); },
        allocUnsafe: function(size) { return new Uint8Array(size); },
        byteLength: function(string, encoding) { return string.length; }
      };
    }
    
    // Ensure global.process exists and matches window.process
    if (!global.process) {
      global.process = window.process;
    } else {
      // Copy all properties from window.process to global.process
      for (const key in window.process) {
        if (!global.process[key]) {
          global.process[key] = window.process[key];
        }
      }
    }
    
    // Ensure global.Buffer exists
    if (!global.Buffer) {
      global.Buffer = window.Buffer;
    }
    
    // Add specific fixes for Mongoose
    // Mongoose uses emitWarning via process.emitWarning.call(process, ...) pattern
    if (typeof global.process.emitWarning === 'function') {
      const originalEmitWarning = global.process.emitWarning;
      global.process.emitWarning = function() {
        try {
          return originalEmitWarning.apply(this, arguments);
        } catch (err) {
          console.warn('[GRIP Polyfill Warning] (fallback):', arguments[0]);
          return undefined;
        }
      };
    }
    
  }
})(); 