import { parse as parseJS } from '@babel/parser'
import { parseAndGenerateServices } from '@typescript-eslint/typescript-estree'
import * as path from 'path'

interface CodeFile {
  path: string
  content: string
  language: string
}

interface CodeStructure {
  fileCount: number
  directoryStructure: string[]
  mainLanguages: { [key: string]: number }
  components: Component[]
  features: Feature[]
}

interface Component {
  name: string
  type: string
  file: string
  dependencies: string[]
  exports: string[]
  imports: string[]
}

interface Feature {
  name: string
  files: string[]
  components: string[]
  description: string
}

function shouldSkipFile(path: string): boolean {
  return path.includes('node_modules') ||
         path.includes('_next') ||
         path.includes('.next') ||
         path.includes('dist') ||
         path.endsWith('.min.js')
}

export async function parseCodeStructure(
  files: CodeFile[],
  progressCallback?: (progress: number) => void
): Promise<CodeStructure> {
  // Filter out files we shouldn't analyze
  const filesToAnalyze = files.filter(file => !shouldSkipFile(file.path))
  const structure: CodeStructure = {
    fileCount: filesToAnalyze.length,
    directoryStructure: [],
    mainLanguages: {},
    components: [],
    features: []
  }

  // Build directory structure
  const directories = new Set<string>()
  filesToAnalyze.forEach(file => {
    const dir = path.dirname(file.path)
    directories.add(dir)
  })
  structure.directoryStructure = Array.from(directories)

  // Count languages
  filesToAnalyze.forEach(file => {
    const ext = path.extname(file.path).toLowerCase()
    structure.mainLanguages[ext] = (structure.mainLanguages[ext] || 0) + 1
  })

  // Parse each file
  let processedFiles = 0
  for (const file of filesToAnalyze) {
    try {
      const components = await parseFileComponents(file)
      structure.components.push(...components)

      // Group related components into features
      const features = identifyFeatures(components)
      structure.features.push(...features)

      processedFiles++
      if (progressCallback) {
        progressCallback((processedFiles / filesToAnalyze.length) * 100)
      }
    } catch (error) {
      console.error(`Error parsing file ${file.path}:`, error)
    }
  }

  return structure
}

async function parseFileComponents(file: CodeFile): Promise<Component[]> {
  const components: Component[] = []
  const ext = path.extname(file.path).toLowerCase()

  try {
    if (ext === '.ts' || ext === '.tsx') {
      const { ast } = parseAndGenerateServices(file.content, {
        jsx: true,
        loc: true,
        range: true,
        tokens: true,
        comment: true,
        useJSXTextNode: true,
        filePath: file.path,
      })
      components.push(...extractComponentsFromAST(ast, file.path))
    } else if (ext === '.js' || ext === '.jsx') {
      const ast = parseJS(file.content, {
        sourceType: 'module',
        plugins: ['jsx']
      })
      components.push(...extractComponentsFromAST(ast, file.path))
    }
  } catch (error) {
    console.error(`Error parsing ${file.path}:`, error)
  }

  return components
}

function extractComponentsFromAST(ast: any, filePath: string): Component[] {
  const components: Component[] = []
  const imports: string[] = []
  const exports: string[] = []

  function visit(node: any) {
    // Handle React Components
    if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
      if (node.id?.name?.endsWith('Component') || 
          node.params.some((p: any) => p.type === 'ObjectPattern' && p.properties.some((prop: any) => prop.key.name === 'props'))) {
        components.push({
          name: node.id?.name || 'AnonymousComponent',
          type: 'function',
          file: filePath,
          dependencies: imports,
          exports,
          imports
        })
      }
    }

    // Handle Class Components
    if (node.type === 'ClassDeclaration' && 
        (node.superClass?.name === 'Component' || node.superClass?.name === 'React.Component')) {
      components.push({
        name: node.id.name,
        type: 'class',
        file: filePath,
        dependencies: imports,
        exports,
        imports
      })
    }

    // Track imports
    if (node.type === 'ImportDeclaration') {
      imports.push(node.source.value)
    }

    // Track exports
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
      if (node.declaration?.id?.name) {
        exports.push(node.declaration.id.name)
      }
    }

    // Visit children
    for (const key in node) {
      if (typeof node[key] === 'object' && node[key] !== null) {
        if (Array.isArray(node[key])) {
          node[key].forEach((child: any) => child && visit(child))
        } else {
          visit(node[key])
        }
      }
    }
  }

  visit(ast)
  return components
}

function identifyFeatures(components: Component[]): Feature[] {
  const features: Feature[] = []
  const componentGroups = new Map<string, Component[]>()

  // Group components by shared dependencies
  components.forEach(component => {
    const key = component.dependencies.sort().join(',')
    if (!componentGroups.has(key)) {
      componentGroups.set(key, [])
    }
    componentGroups.get(key)!.push(component)
  })

  // Create features from component groups
  componentGroups.forEach((groupComponents) => {
    if (groupComponents.length > 0) {
      const mainComponent = groupComponents[0]
      features.push({
        name: mainComponent.name.replace('Component', 'Feature'),
        files: groupComponents.map(c => c.file),
        components: groupComponents.map(c => c.name),
        description: `Feature centered around ${mainComponent.name} with ${groupComponents.length - 1} related components`
      })
    }
  })

  return features
} 
