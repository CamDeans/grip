import type { ProjectAnalysis } from '../services/analysisService'

interface AnalysisResult {
  complexity: {
    cognitive: number
    cyclomatic: number
    halstead: number
  }
  maintainability: {
    score: number
    issues: string[]
  }
  dependencies: {
    direct: string[]
    dev: string[]
    peer: string[]
  }
  security: {
    vulnerabilities: string[]
    recommendations: string[]
  }
}

export async function analyzeCode(code: string): Promise<AnalysisResult> {
  // Basic code analysis
  const lines = code.split('\n')
  const functions = code.match(/function\s+\w+\s*\(/g) || []
  const classes = code.match(/class\s+\w+/g) || []
  const imports = code.match(/import\s+.*from/g) || []
  
  // Calculate cognitive complexity based on nesting and branching
  const cognitiveScore = (
    (code.match(/if|while|for|switch/g) || []).length + // Control structures
    (code.match(/\{|\}/g) || []).length / 2 + // Nesting levels
    classes.length * 2 // Class complexity
  )
  
  // Calculate cyclomatic complexity based on decision points
  const cyclomaticScore = (
    (code.match(/if|while|for|switch|&&|\|\||catch/g) || []).length + 1 +
    classes.length // Each class adds to complexity
  )
  
  // Calculate Halstead complexity based on operators and operands
  const operators = code.match(/[+\-*/%=<>!&|^~]|\b(if|while|for|switch|catch)\b/g) || []
  const operands = code.match(/\b\w+\b/g) || []
  const halsteadScore = (
    operators.length * Math.log(operators.length) +
    operands.length * Math.log(operands.length)
  )

  // Analyze dependencies
  const directDeps = imports
    .map(imp => imp.match(/from\s+['"](.+?)['"]/)?.[1])
    .filter(Boolean) as string[]

  // Check for potential security issues
  const securityIssues = [
    ...(code.includes('eval(') ? ['Usage of eval() detected'] : []),
    ...(code.includes('innerHTML') ? ['Direct innerHTML manipulation detected'] : []),
    ...(code.includes('localStorage') ? ['Local storage usage detected - ensure sensitive data handling'] : []),
    ...(classes.some(c => code.includes(`${c.split(' ')[1]}.prototype`)) ? 
      ['Direct prototype manipulation detected'] : [])
  ]

  // Generate maintainability issues
  const maintainabilityIssues = [
    ...(lines.length > 300 ? ['File is too long (>300 lines)'] : []),
    ...(functions.length > 10 ? ['Too many functions in one file'] : []),
    ...(classes.length > 3 ? ['Too many classes in one file'] : []),
    ...(code.includes('TODO') ? ['TODO comments found - needs implementation'] : []),
    ...(code.includes('any') ? ['Usage of "any" type detected'] : []),
    ...(classes.length > 0 && !code.includes('implements') ? 
      ['Classes found without interface implementations'] : [])
  ]

  return {
    complexity: {
      cognitive: Math.round(cognitiveScore),
      cyclomatic: cyclomaticScore,
      halstead: Math.round(halsteadScore)
    },
    maintainability: {
      score: Math.max(0, 100 - maintainabilityIssues.length * 10),
      issues: maintainabilityIssues
    },
    dependencies: {
      direct: directDeps,
      dev: [],  // Would need package.json analysis for these
      peer: []  // Would need package.json analysis for these
    },
    security: {
      vulnerabilities: securityIssues,
      recommendations: securityIssues.map(issue => 
        `Fix security issue: ${issue.toLowerCase()}`
      )
    }
  }
}

export function enrichProjectAnalysis(analysis: ProjectAnalysis): ProjectAnalysis {
  // Get code structure and feature mapping from analysis
  const codeStructure = {
    fileCount: analysis.codeStructure.fileCount,
    directoryStructure: analysis.codeStructure.directoryStructure,
    mainLanguages: analysis.codeStructure.mainLanguages,
    components: analysis.codeStructure.components
  }

  const featureMapping = analysis.featureMapping || {
    matchedFeatures: []
  }

  // Generate new recommendations
  const newRecommendations = generateRecommendations(codeStructure, featureMapping)

  // Calculate updated complexity metrics
  const complexityMetrics = calculateComplexity(codeStructure)

  // Generate chat context
  const chatContext = generateChatContext(
    codeStructure,
    complexityMetrics,
    [...analysis.recommendations, ...newRecommendations]
  )

  return {
    ...analysis,
    complexity: {
      ...analysis.complexity,
      ...complexityMetrics
    },
    securityIssues: [
      ...analysis.securityIssues,
      // Add any new security issues found from code analysis
      ...(codeStructure.components || [])
        .filter(comp => comp.content?.includes('eval('))
        .map(() => 'Usage of eval() detected in codebase')
    ],
    recommendations: [
      ...analysis.recommendations,
      ...newRecommendations
    ],
    chatContext // Add the generated chat context
  }
}

function generateRecommendations(codeStructure: any, featureMapping: any): string[] {
  const recommendations: string[] = []

  // Add basic recommendations
  if (codeStructure.fileCount > 100) {
    recommendations.push('Consider breaking down the project into smaller modules')
  }

  // Add feature-based recommendations
  if (featureMapping?.matchedFeatures) {
    featureMapping.matchedFeatures.forEach((feature: any) => {
      if (feature.confidence < 0.7) {
        recommendations.push(`Improve implementation of ${feature.name} feature`)
      }
    })
  }

  // Add default recommendations if none were generated
  if (recommendations.length === 0) {
    recommendations.push(
      'Set up proper project structure',
      'Implement basic testing framework',
      'Add documentation',
      'Configure CI/CD pipeline'
    )
  }

  return recommendations
}

function calculateComplexity(codeStructure: any) {
  return {
    linesOfCode: calculateTotalLines(codeStructure),
    averageFileSize: calculateAverageFileSize(codeStructure),
    cyclomaticComplexity: calculateCyclomaticComplexity(codeStructure)
  }
}

function generateChatContext(
  codeStructure: any,
  complexity: any,
  recommendations: string[]
): string {
  return `
I have completed the initial analysis of your codebase. Here's what I found:

📊 Code Structure Overview
-------------------------
• Total Files: ${codeStructure.fileCount}
• Lines of Code: ${complexity.linesOfCode}
• Average File Size: ${complexity.averageFileSize} lines

🔍 Technical Stack
----------------
Primary Languages:
${Object.keys(codeStructure.mainLanguages)
  .map(lang => `• ${lang}`)
  .join('\n')}

📋 Key Recommendations
--------------------
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

🔄 Next Steps
-----------
Based on this analysis, I can help you:
• Implement specific features
• Improve code structure
• Set up testing frameworks
• Add documentation
• Configure development workflows

Let me know which area you'd like to focus on first, and I'll provide detailed guidance.
`
}

// Helper functions
function calculateTotalLines(codeStructure: any): number {
  return codeStructure.components.reduce((total: number, component: any) => {
    return total + (component.content?.split('\n').length || 0)
  }, 0)
}

function calculateAverageFileSize(codeStructure: any): number {
  if (!codeStructure.components.length) return 0
  const totalLines = calculateTotalLines(codeStructure)
  return Math.round(totalLines / codeStructure.components.length)
}

function calculateCyclomaticComplexity(codeStructure: any): number {
  // Simplified complexity calculation
  return codeStructure.components.length * 2
}

// Export generateChatContext for potential standalone use
export { generateChatContext } 
