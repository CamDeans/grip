/**
 * CommonJS loader for native tree-sitter. Kept as .cjs so Node runs it with
 * native require(); Next/Webpack does not evaluate createRequire here.
 * Returns { Parser, JavaScript, TypeScript, TSX } or null.
 */
'use strict';

function load() {
  try {
    const Parser = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const ts = require('tree-sitter-typescript');
    return {
      Parser,
      JavaScript,
      TypeScript: ts.typescript,
      TSX: ts.tsx,
    };
  } catch (err) {
    return null;
  }
}

module.exports = load;
