import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        {/* Inline script for polyfills - this runs before any other JS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  console.log('Applying critical GRIP polyfills...');
                  
                  // Ensure global exists
                  if (!window.global) {
                    window.global = window;
                  }
                  
                  // Ensure process exists
                  if (!window.process) {
                    window.process = {};
                  }
                  
                  // Ensure process.emitWarning exists - this is the critical function
                  if (!window.process.emitWarning) {
                    window.process.emitWarning = function(warning, options) {
                      console.warn('[GRIP Critical Polyfill]:', warning, options);
                    };
                  }
                  
                  // Ensure global.process exists and has emitWarning
                  if (!global.process) {
                    global.process = window.process;
                  } else if (!global.process.emitWarning) {
                    global.process.emitWarning = window.process.emitWarning;
                  }
                  
                  // Ensure Buffer exists
                  if (!window.Buffer) {
                    window.Buffer = {
                      isBuffer: function(obj) { return false; },
                      from: function(data, encoding) { return data; },
                      alloc: function(size) { return new Uint8Array(size); }
                    };
                  }
                  
                  if (!global.Buffer) {
                    global.Buffer = window.Buffer;
                  }
                  
                  console.log('Critical GRIP polyfills applied');
                }
              })();
            `
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 