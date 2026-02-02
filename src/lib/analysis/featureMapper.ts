import type { ProjectIdeation } from '../services/analysisService'

interface MatchedFeature {
  name: string
  confidence: number
  status: 'implemented' | 'partial' | 'missing'
  details: string
}

interface Feature {
  name: string
  technologies?: string[]
  hasTests?: boolean
  hasDocumentation?: boolean
  type?: string
}

export async function matchFeatures(existingFeatures: any[], ideation: ProjectIdeation): Promise<MatchedFeature[]> {
  const matchedFeatures: MatchedFeature[] = []

  // Parse ideation goals and features
  const desiredFeatures = ideation.keyFeatures
    .split(',')
    .map(f => f.trim().toLowerCase())

  // Match existing features with desired features
  existingFeatures.forEach(existing => {
    const featureName = existing.name.toLowerCase()
    const matchingDesired = desiredFeatures.find(desired => 
      desired.includes(featureName) || featureName.includes(desired)
    )

    if (matchingDesired) {
      matchedFeatures.push({
        name: existing.name,
        confidence: calculateConfidence(existing),
        status: determineStatus(existing),
        details: generateDetails(existing)
      })
    }
  })

  // Add missing desired features
  desiredFeatures.forEach(desired => {
    const isImplemented = matchedFeatures.some(match => 
      match.name.toLowerCase().includes(desired) ||
      desired.includes(match.name.toLowerCase())
    )

    if (!isImplemented) {
      matchedFeatures.push({
        name: desired,
        confidence: 0,
        status: 'missing',
        details: 'Feature not found in codebase'
      })
    }
  })

  return matchedFeatures
}

function calculateConfidence(feature: any): number {
  // Calculate confidence based on implementation completeness
  const hasTests = feature.tests && feature.tests.length > 0
  const hasDocumentation = feature.documentation
  const hasImplementation = feature.implementation && Object.keys(feature.implementation).length > 0

  let confidence = 0
  if (hasImplementation) confidence += 0.6
  if (hasTests) confidence += 0.2
  if (hasDocumentation) confidence += 0.2

  return confidence
}

function determineStatus(feature: any): 'implemented' | 'partial' | 'missing' {
  const confidence = calculateConfidence(feature)
  if (confidence >= 0.8) return 'implemented'
  if (confidence > 0) return 'partial'
  return 'missing'
}

function generateDetails(feature: any): string {
  const status = determineStatus(feature)
  const confidence = calculateConfidence(feature)
  const confidencePercent = Math.round(confidence * 100)

  const details = []
  if (status === 'implemented') {
    details.push(`✅ Fully implemented (${confidencePercent}% confidence)`)
  } else if (status === 'partial') {
    details.push(`⚠️ Partially implemented (${confidencePercent}% confidence)`)
    if (!feature.tests) details.push('Missing tests')
    if (!feature.documentation) details.push('Missing documentation')
  } else {
    details.push('❌ Not implemented')
  }

  return details.join(', ')
}

export type { MatchedFeature }

export interface IdeationMapping {
  matchedFeatures: MatchedFeature[]
  missingRequirements: string[]
  implementationGaps: string[]
  technicalSuggestions: string[]
}

export async function mapFeaturesToIdeation(
  features: Feature[],
  ideation: ProjectIdeation
): Promise<IdeationMapping> {
  // Match features with ideation requirements
  const matchedFeatures = await matchFeatures(features, ideation)

  // Identify missing technical requirements
  const requiredTechnologies: string[] = ideation.technicalRequirements
    ?.split(',')
    .map((tech: string) => tech.trim().toLowerCase()) || []

  const existingTechnologies: string[] = features
    .flatMap((f: Feature) => f.technologies || [])
    .map((tech: string) => tech.toLowerCase())

  const missingRequirements: string[] = requiredTechnologies
    .filter((required: string) => !existingTechnologies.includes(required))
    .map((tech: string) => `Missing required technology: ${tech}`)

  // Identify implementation gaps
  const implementationGaps: string[] = matchedFeatures
    .filter((feature: MatchedFeature) => feature.status !== 'implemented')
    .map((feature: MatchedFeature) => {
      if (feature.status === 'missing') {
        return `Missing feature: ${feature.name}`
      }
      return `Incomplete feature: ${feature.name} (${feature.details})`
    })

  // Generate technical suggestions
  const technicalSuggestions: string[] = [
    // Architecture suggestions
    ...(!features.some((f: Feature) => f.hasTests) ? ['Add testing infrastructure'] : []),
    ...(!features.some((f: Feature) => f.hasDocumentation) ? ['Add documentation system'] : []),
    
    // Technology-specific suggestions
    ...(requiredTechnologies.includes('typescript') && !existingTechnologies.includes('typescript')
      ? ['Set up TypeScript configuration']
      : []),
    ...(requiredTechnologies.includes('api') && !features.some((f: Feature) => f.type === 'api')
      ? ['Implement API infrastructure']
      : []),
    
    // Default suggestions if none were generated
    ...(implementationGaps.length === 0 ? [
      'Consider adding monitoring and logging',
      'Set up CI/CD pipeline',
      'Implement error handling strategy'
    ] : [])
  ]

  return {
    matchedFeatures,
    missingRequirements,
    implementationGaps,
    technicalSuggestions
  }
} 
