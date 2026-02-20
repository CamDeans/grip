/**
 * CommonJS loader for native tree-sitter. Kept as .cjs so Node runs it with
 * native require(); Next/Webpack does not evaluate it at build time.
 * Returns { Parser, languages: { ext: Language } } for all successfully loaded grammars.
 * Core (JS/TS/TSX) are required; other languages load with try/catch so one failure doesn't break the rest.
 */
'use strict';

function loadLang(name, loader) {
  try {
    const m = loader();
    return m && (m.default || m);
  } catch {
    return null;
  }
}

function load() {
  try {
    const Parser = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const ts = require('tree-sitter-typescript');
    const languages = {
      js: JavaScript,
      jsx: JavaScript,
      ts: ts.typescript,
      tsx: ts.tsx,
    };

    // Optional multi-language grammars (each try/catch so one failure doesn't break others)
    const optional = [
      ['py', () => require('tree-sitter-python')],
      ['html', () => require('tree-sitter-html')],
      ['htm', () => require('tree-sitter-html')],
      ['css', () => require('tree-sitter-css')],
      ['json', () => require('tree-sitter-json')],
      ['c', () => require('tree-sitter-c')],
      ['h', () => require('tree-sitter-c')],
      ['cpp', () => require('tree-sitter-cpp')],
      ['cc', () => require('tree-sitter-cpp')],
      ['cxx', () => require('tree-sitter-cpp')],
      ['hpp', () => require('tree-sitter-cpp')],
      ['go', () => require('tree-sitter-go')],
      ['rs', () => require('tree-sitter-rust')],
      ['rb', () => require('tree-sitter-ruby')],
      ['java', () => require('tree-sitter-java')],
      ['lua', () => require('tree-sitter-lua')],
      ['bash', () => require('tree-sitter-bash')],
      ['sh', () => require('tree-sitter-bash')],
      ['md', () => require('tree-sitter-markdown')],
      ['markdown', () => require('tree-sitter-markdown')],
      ['yaml', () => require('tree-sitter-yaml')],
      ['yml', () => require('tree-sitter-yaml')],
      ['toml', () => require('tree-sitter-toml')],
      ['php', () => require('tree-sitter-php')],
      ['kt', () => require('tree-sitter-kotlin')],
      ['kts', () => require('tree-sitter-kotlin')],
      ['swift', () => require('tree-sitter-swift')],
    ];

    for (const [ext, loader] of optional) {
      const lang = loadLang(ext, loader);
      if (lang) languages[ext] = lang;
    }

    return { Parser, languages };
  } catch (err) {
    return null;
  }
}

module.exports = load;
