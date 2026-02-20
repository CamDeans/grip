/**
 * Native tree-sitter parsing for GRIP repository analysis.
 * Uses full tree-sitter API (Parser, Language, cursor walk). Loads via treeSitterLoader.cjs
 * so Next/Webpack does not evaluate require at build time.
 * Only used for user's linked repo—never GRIP code.
 * Supports JS/TS/TSX (full extract: imports, exports, functions, classes, components)
 * and many other languages (parse-only; empty extract for structure/counts).
 */

import * as path from 'path'

export type TreeSitterExtract = {
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  components: Array<{
    name: string
    type: string
    file: string
    dependencies: string[]
    exports: string[]
    imports: string[]
  }>
}

type LanguagesMap = Record<string, unknown>

let Parser: any = null
let languages: LanguagesMap | null = null
let loadPromise: Promise<boolean> | null = null

/**
 * Load native tree-sitter from .cjs loader. Call once at start of analysis;
 * then isTreeSitterAvailable() and parseWithTreeSitter use the result.
 */
export async function loadNativeTreeSitterAsync(): Promise<boolean> {
  if (Parser !== null && languages !== null) return true
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const load = (await import('./treeSitterLoader.cjs')).default
      const lib = load()
      if (lib && lib.Parser && lib.languages && (lib.languages.js || lib.languages.ts)) {
        Parser = lib.Parser
        languages = lib.languages as LanguagesMap
        return true
      }
    } catch (err) {
      console.warn('[tree-sitter] native load failed, using Babel/TS-estree fallback for JS/TS:', err instanceof Error ? err.message : String(err))
    }
    Parser = null
    languages = null
    return false
  })()
  return loadPromise
}

function getLanguages(): LanguagesMap | null {
  return languages
}

function getNodeText(node: { startIndex: number; endIndex: number }, source: string): string {
  if (typeof source !== 'string') return ''
  return source.slice(node.startIndex, node.endIndex).trim()
}

function findIdentifierName(node: any, source: string): string {
  if (!node) return ''
  const type = node.type as string
  if (type === 'identifier' || type === 'property_identifier') {
    return getNodeText(node, source)
  }
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    const name = findIdentifierName(child, source)
    if (name) return name
  }
  return ''
}

function getChildByField(node: any, field: string): any {
  if (typeof node.childForFieldName === 'function') {
    return node.childForFieldName(field)
  }
  return null
}

function getChild(node: any, index: number): any {
  if (node.childCount > index) return node.child(index)
  return null
}

function walk(
  node: any,
  source: string,
  filePath: string,
  acc: TreeSitterExtract
): void {
  if (!node) return
  const type = node.type as string

  switch (type) {
    case 'import_statement':
    case 'import_declaration': {
      const from = getChildByField(node, 'source') || getChild(node, node.childCount - 1)
      if (from) {
        const raw = getNodeText(from, source)
        const pathVal = raw.replace(/^['"]|['"]$/g, '')
        if (pathVal) acc.imports.push(pathVal)
      }
      break
    }
    case 'export_statement':
    case 'export_default_declaration':
    case 'export_named_declaration': {
      const decl = getChildByField(node, 'declaration') || getChild(node, 1)
      const name = decl ? findIdentifierName(decl, source) : ''
      if (name) acc.exports.push(name)
      break
    }
    case 'function_declaration': {
      const nameNode = getChildByField(node, 'name') || getChild(node, 0)
      const name = nameNode ? (nameNode.type === 'identifier' ? getNodeText(nameNode, source) : findIdentifierName(nameNode, source)) : ''
      if (name) {
        acc.functions.push(name)
        if (
          name.endsWith('Component') ||
          name === 'Component' ||
          /^[A-Z]/.test(name)
        ) {
          acc.components.push({
            name,
            type: 'function',
            file: filePath,
            dependencies: [...acc.imports],
            exports: [...acc.exports],
            imports: [...acc.imports],
          })
        }
      }
      break
    }
    case 'class_declaration': {
      const nameNode = getChildByField(node, 'name') || getChild(node, 0)
      const name = nameNode ? (nameNode.type === 'identifier' ? getNodeText(nameNode, source) : findIdentifierName(nameNode, source)) : ''
      if (name) {
        acc.classes.push(name)
        acc.components.push({
          name,
          type: 'class',
          file: filePath,
          dependencies: [...acc.imports],
          exports: [...acc.exports],
          imports: [...acc.imports],
        })
      }
      break
    }
    default:
      break
  }

  for (let i = 0; i < node.childCount; i++) {
    walk(node.child(i), source, filePath, acc)
  }
}

/** Extensions that get full JS/TS-style extraction (imports, exports, functions, classes, components). */
const JS_LIKE_EXTS = new Set(['js', 'jsx', 'ts', 'tsx'])

/**
 * Parse a single file with native tree-sitter. For .js/.jsx/.ts/.tsx returns full extract;
 * for other supported languages returns empty extract (parse-only for structure/counts).
 * Returns null if tree-sitter not available, language not supported, or parse fails.
 */
export function parseWithTreeSitter(
  filePath: string,
  content: string
): TreeSitterExtract | null {
  const langMap = getLanguages()
  if (!Parser || !langMap || !content) return null

  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '') || 'js'
  const extKey = ext === 'tsx' ? 'tsx' : ext === 'ts' ? 'ts' : ext === 'jsx' ? 'jsx' : ext === 'js' ? 'js' : ext
  const lang = langMap[extKey] ?? (ext === 'h' ? langMap['c'] : ext === 'hpp' || ext === 'cc' || ext === 'cxx' ? langMap['cpp'] : ext === 'htm' ? langMap['html'] : ext === 'yml' ? langMap['yaml'] : ext === 'kts' ? langMap['kt'] : langMap[ext])
  if (!lang) return null

  try {
    const parser = new Parser()
    parser.setLanguage(lang)
    const tree = parser.parse(content)
    const root = tree.rootNode
    if (!root) return null

    const acc: TreeSitterExtract = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      components: [],
    }
    if (JS_LIKE_EXTS.has(extKey)) {
      walk(root, content, filePath, acc)
    }
    return acc
  } catch {
    return null
  }
}

export function isTreeSitterAvailable(): boolean {
  return Parser !== null && languages !== null
}

/** List of file extensions that can be parsed (for SOURCE_EXT / collectFiles). */
export const PARSABLE_EXTENSIONS: readonly string[] = [
  'js', 'jsx', 'ts', 'tsx',
  'py', 'html', 'htm', 'css', 'json',
  'c', 'h', 'cpp', 'cc', 'cxx', 'hpp',
  'go', 'rs', 'rb', 'java', 'lua',
  'sh', 'bash', 'md', 'markdown', 'yml', 'yaml', 'toml',
  'php', 'kt', 'kts', 'swift',
]
