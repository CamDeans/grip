/**
 * Sandbox-only: native tree-sitter parsing when optionalDependencies are installed.
 * Uses full tree-sitter API (Parser, Language, cursor walk). Falls back to null
 * so caller can use Babel/TS-estree. Only used for user's linked repo—never GRIP code.
 * Loads via treeSitterLoader.cjs (plain require) to avoid Webpack/Next evaluating createRequire.
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

let Parser: any = null
let JavaScript: any = null
let TypeScript: any = null
let TSX: any = null
let loadPromise: Promise<boolean> | null = null

/**
 * Load native tree-sitter from .cjs loader (runs in Node with plain require).
 * Call once at start of sandbox analysis; then isTreeSitterAvailable() and parseWithTreeSitter use the result.
 */
export async function loadNativeTreeSitterAsync(): Promise<boolean> {
  if (Parser !== null) return true
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      const load = (await import('./treeSitterLoader.cjs')).default
      const lib = load()
      if (lib && lib.Parser && lib.JavaScript && lib.TypeScript && lib.TSX) {
        Parser = lib.Parser
        JavaScript = lib.JavaScript
        TypeScript = lib.TypeScript
        TSX = lib.TSX
        return true
      }
    } catch (err) {
      console.warn('[Sandbox tree-sitter] native load failed, using Babel fallback:', err instanceof Error ? err.message : String(err))
    }
    Parser = null
    JavaScript = null
    TypeScript = null
    TSX = null
    return false
  })()
  return loadPromise
}

function loadNativeTreeSitter(): boolean {
  return Parser !== null
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
        const path = raw.replace(/^['"]|['"]$/g, '')
        if (path) acc.imports.push(path)
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

/**
 * Parse a single file with native tree-sitter (JS/TS/TSX). Returns extraction or null
 * if tree-sitter is not available or parse fails. Used only for user repo content.
 */
export function parseWithTreeSitter(
  filePath: string,
  content: string
): TreeSitterExtract | null {
  if (!loadNativeTreeSitter() || !content) return null

  const ext = path.extname(filePath).toLowerCase()
  let lang = JavaScript
  if (ext === '.ts') lang = TypeScript
  else if (ext === '.tsx') lang = TSX
  else if (ext !== '.js' && ext !== '.jsx') return null

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
    walk(root, content, filePath, acc)
    return acc
  } catch {
    return null
  }
}

export function isTreeSitterAvailable(): boolean {
  return loadNativeTreeSitter()
}
