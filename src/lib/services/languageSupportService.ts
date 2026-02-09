import { Anthropic } from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

/**
 * Language Support Service - Adds support for multiple programming languages
 * Part of Phase 4, Step 3 of the G.R.I.P. AI Assistant Enhancement Plan
 */

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

/**
 * Interface for language configuration
 */
export interface LanguageConfig {
  id: string;
  name: string;
  fileExtensions: string[];
  defaultImports?: string[];
  commentStyle: {
    line: string;
    blockStart?: string;
    blockEnd?: string;
  };
  features: {
    classes: boolean;
    interfaces: boolean;
    typeSystem: boolean;
    asyncAwait: boolean;
    functions: boolean;
    modules: boolean;
    jsx: boolean;
  };
  formatting: {
    indentation: 'tabs' | 'spaces';
    spacesPerIndent?: number;
    bracesOnNewLine: boolean;
    semicolons: boolean;
  };
}

/**
 * All supported programming languages
 */
export const supportedLanguages: LanguageConfig[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    fileExtensions: ['ts', 'tsx'],
    defaultImports: [],
    commentStyle: {
      line: '//',
      blockStart: '/*',
      blockEnd: '*/'
    },
    features: {
      classes: true,
      interfaces: true,
      typeSystem: true,
      asyncAwait: true,
      functions: true,
      modules: true,
      jsx: true
    },
    formatting: {
      indentation: 'spaces',
      spacesPerIndent: 2,
      bracesOnNewLine: false,
      semicolons: true
    }
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    fileExtensions: ['js', 'jsx'],
    defaultImports: [],
    commentStyle: {
      line: '//',
      blockStart: '/*',
      blockEnd: '*/'
    },
    features: {
      classes: true,
      interfaces: false,
      typeSystem: false,
      asyncAwait: true,
      functions: true,
      modules: true,
      jsx: true
    },
    formatting: {
      indentation: 'spaces',
      spacesPerIndent: 2,
      bracesOnNewLine: false,
      semicolons: true
    }
  },
  {
    id: 'python',
    name: 'Python',
    fileExtensions: ['py'],
    defaultImports: [],
    commentStyle: {
      line: '#',
      blockStart: '"""',
      blockEnd: '"""'
    },
    features: {
      classes: true,
      interfaces: false,
      typeSystem: false,
      asyncAwait: true,
      functions: true,
      modules: true,
      jsx: false
    },
    formatting: {
      indentation: 'spaces',
      spacesPerIndent: 4,
      bracesOnNewLine: false,
      semicolons: false
    }
  },
  {
    id: 'html',
    name: 'HTML',
    fileExtensions: ['html', 'htm'],
    defaultImports: [],
    commentStyle: {
      line: '',
      blockStart: '<!--',
      blockEnd: '-->'
    },
    features: {
      classes: false,
      interfaces: false,
      typeSystem: false,
      asyncAwait: false,
      functions: false,
      modules: false,
      jsx: false
    },
    formatting: {
      indentation: 'spaces',
      spacesPerIndent: 2,
      bracesOnNewLine: false,
      semicolons: false
    }
  },
  {
    id: 'css',
    name: 'CSS',
    fileExtensions: ['css'],
    defaultImports: [],
    commentStyle: {
      line: '',
      blockStart: '/*',
      blockEnd: '*/'
    },
    features: {
      classes: false,
      interfaces: false,
      typeSystem: false,
      asyncAwait: false,
      functions: false,
      modules: false,
      jsx: false
    },
    formatting: {
      indentation: 'spaces',
      spacesPerIndent: 2,
      bracesOnNewLine: false,
      semicolons: true
    }
  }
]

/**
 * Get language config by ID
 * @param languageId Language ID to find
 * @returns Language config or null if not found
 */
export function getLanguageConfig(languageId: string): LanguageConfig | null {
  return supportedLanguages.find(lang => lang.id === languageId) || null
}

/**
 * Get language config by file extension
 * @param extension File extension (without dot)
 * @returns Language config or null if not found
 */
export function getLanguageConfigByExtension(extension: string): LanguageConfig | null {
  return supportedLanguages.find(
    lang => lang.fileExtensions.includes(extension.toLowerCase())
  ) || null
}

/**
 * Add comments to code based on language
 * @param languageId Language ID
 * @param code Code to add comments to
 * @param comment Comment text
 * @param type Comment type (line or block)
 * @returns Code with comments
 */
export function addComments(
  languageId: string,
  code: string,
  comment: string,
  type: 'line' | 'block' = 'line'
): string {
  const language = getLanguageConfig(languageId)
  if (!language) {
    return code
  }
  
  if (type === 'line') {
    const lineComment = language.commentStyle.line
    if (!lineComment) {
      return code
    }
    
    const commentLines = comment.split('\n')
    const commentedLines = commentLines.map(line => `${lineComment} ${line}`)
    return commentedLines.join('\n') + '\n\n' + code
  } else {
    const { blockStart, blockEnd } = language.commentStyle
    if (!blockStart || !blockEnd) {
      return code
    }
    
    return `${blockStart}\n${comment}\n${blockEnd}\n\n${code}`
  }
}

/**
 * Format code according to language conventions
 * @param languageId Language ID
 * @param code Code to format
 * @returns Formatted code
 */
export function formatCode(languageId: string, code: string): string {
  const language = getLanguageConfig(languageId)
  if (!language) {
    return code
  }
  
  // Basic formatting only - in a real app you'd use a proper formatter like Prettier
  let formattedCode = code
  
  // Handle indentation
  const indentation = language.formatting.indentation === 'spaces'
    ? ' '.repeat(language.formatting.spacesPerIndent || 2)
    : '\t'
  
  // Handle semicolons - very basic implementation
  if (language.formatting.semicolons && !formattedCode.trim().endsWith(';')) {
    const lines = formattedCode.split('\n')
    formattedCode = lines.map(line => {
      const trimmed = line.trim()
      // Don't add semicolons to lines that don't need them
      if (trimmed && 
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') && 
          !trimmed.endsWith(':') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*')) {
        return line + ';'
      }
      return line
    }).join('\n')
  }
  
  return formattedCode
}

/**
 * Generate code in a specific language using AI
 * @param languageId Language ID
 * @param prompt Description of code to generate
 * @param contextCode Related code for context
 * @returns Generated code
 */
export async function generateLanguageSpecificCode(
  languageId: string,
  prompt: string,
  contextCode?: string
): Promise<string> {
  try {
    const language = getLanguageConfig(languageId)
    if (!language) {
      throw new Error(`Unsupported language: ${languageId}`)
    }
    
    // Build AI prompt
    const aiPrompt = `
I need you to generate ${language.name} code based on this description:

${prompt}

${contextCode ? `Here is some related code for context:\n\n${contextCode}\n` : ''}

Language: ${language.name}
File extension: ${language.fileExtensions[0]}

Language features available:
- Classes: ${language.features.classes ? 'Yes' : 'No'}
- Interfaces: ${language.features.interfaces ? 'Yes' : 'No'}
- Type system: ${language.features.typeSystem ? 'Yes' : 'No'}
- Async/await: ${language.features.asyncAwait ? 'Yes' : 'No'}
- Functions: ${language.features.functions ? 'Yes' : 'No'}
- Modules: ${language.features.modules ? 'Yes' : 'No'}
- JSX: ${language.features.jsx ? 'Yes' : 'No'}

Please follow these formatting conventions:
- Indentation: ${language.formatting.indentation === 'spaces' ? `${language.formatting.spacesPerIndent} spaces` : 'tabs'}
- Braces: ${language.formatting.bracesOnNewLine ? 'On new line' : 'Same line'}
- Semicolons: ${language.formatting.semicolons ? 'Required' : 'Not required'}

Respond ONLY with the code, without any explanation or markdown code blocks. The code should be complete, well-structured, and follow best practices for ${language.name}.
`
    
    // Use AI to generate code
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: aiPrompt }]
    })
    
    const generatedCode = response.content[0].text.trim()
    
    // Format the generated code
    return formatCode(languageId, generatedCode)
  } catch (error) {
    console.error('Error generating language-specific code:', error)
    return ''
  }
}

/**
 * Convert code from one language to another
 * @param sourceLanguageId Source language ID
 * @param targetLanguageId Target language ID
 * @param code Code to convert
 * @returns Converted code
 */
export async function convertCode(
  sourceLanguageId: string,
  targetLanguageId: string,
  code: string
): Promise<string> {
  try {
    const sourceLanguage = getLanguageConfig(sourceLanguageId)
    const targetLanguage = getLanguageConfig(targetLanguageId)
    
    if (!sourceLanguage) {
      throw new Error(`Unsupported source language: ${sourceLanguageId}`)
    }
    
    if (!targetLanguage) {
      throw new Error(`Unsupported target language: ${targetLanguageId}`)
    }
    
    // Build AI prompt
    const aiPrompt = `
Please convert the following ${sourceLanguage.name} code to ${targetLanguage.name}:

${code}

Source language: ${sourceLanguage.name}
Target language: ${targetLanguage.name}

Make sure the converted code:
1. Works as close as possible to the original 
2. Follows ${targetLanguage.name} best practices and idioms
3. Uses appropriate language features

Respond ONLY with the converted code, without any explanation or markdown code blocks.
`
    
    // Use AI to convert code
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: aiPrompt }]
    })
    
    const convertedCode = response.content[0].text.trim()
    
    // Format the converted code
    return formatCode(targetLanguageId, convertedCode)
  } catch (error) {
    console.error('Error converting code:', error)
    return ''
  }
}

/**
 * Generate imports based on code content and language
 * @param languageId Language ID
 * @param code Code to analyze
 * @returns Array of import statements
 */
export async function generateImports(languageId: string, code: string): Promise<string[]> {
  try {
    const language = getLanguageConfig(languageId)
    if (!language) {
      throw new Error(`Unsupported language: ${languageId}`)
    }
    
    // If language doesn't support modules, return empty array
    if (!language.features.modules) {
      return []
    }
    
    // Build AI prompt
    const aiPrompt = `
Analyze this ${language.name} code and identify all imports that would be needed:

${code}

Generate only the import statements needed for the code to work properly. 
Respond with a JSON array of strings, each containing an import statement. For example:
["import React from 'react'", "import { useState } from 'react'"]

DO NOT include any explanation, just the JSON array.
`
    
    // Use AI to generate imports
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: 'user', content: aiPrompt }]
    })
    
    const content = response.content[0].text.trim()
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : '[]'
    
    try {
      const imports = JSON.parse(jsonString) as string[]
      return imports
    } catch (error) {
      console.error('Error parsing imports JSON:', error)
      return []
    }
  } catch (error) {
    console.error('Error generating imports:', error)
    return []
  }
} 