import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Helper function to chunk content
function chunkContent(content: string, maxChunkSize: number = 8000): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  
  const files = content.split('File: ')
  
  for (const file of files) {
    if (!file.trim()) continue
    
    if ((currentChunk + file).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = ''
      }
      // If a single file is too large, truncate it
      if (file.length > maxChunkSize) {
        chunks.push(file.slice(0, maxChunkSize))
        continue
      }
    }
    currentChunk += 'File: ' + file
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

// Helper function to summarize analysis chunks
async function summarizeAnalysis(chunks: string[]): Promise<string> {
  const summaries = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await anthropic.messages.create({
        model: 'claude-2.1',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze this code chunk and provide a brief summary:

${chunk}

Focus on:
1. Key patterns and structures
2. Important dependencies
3. Notable features`
          }
        ],
      })
      return response.content[0].text
    })
  )

  // Combine summaries
  const finalResponse = await anthropic.messages.create({
    model: 'claude-2.1',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Combine these analysis summaries into a comprehensive overview:

${summaries.join('\n\n')}

Provide a structured analysis covering:
1. Overall Architecture
2. Code Organization
3. Design Patterns
4. Dependencies and Technologies
5. Potential Improvements
6. Security Considerations
7. Performance Optimization Opportunities`
      }
    ],
  })

  return finalResponse.content[0].text
}

export async function analyzeRepository(content: string) {
  try {
    console.log('Chunking repository content')
    const chunks = chunkContent(content)
    console.log(`Split into ${chunks.length} chunks`)

    console.log('Analyzing chunks')
    const analysis = await summarizeAnalysis(chunks)
    console.log('Analysis completed')

    return analysis
  } catch (error) {
    console.error('AI analysis error:', error)
    throw new Error('Failed to analyze repository')
  }
}

export async function generateCodeSuggestions(analysis: string) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-2.1',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Based on this repository analysis, suggest specific code improvements:

${analysis}

Please provide:
1. Specific code changes that could be made
2. Why each change would be beneficial
3. Any potential implementation challenges`
        }
      ],
    })

    return response.content[0].text
  } catch (error) {
    console.error('Code suggestions error:', error)
    throw new Error('Failed to generate code suggestions')
  }
}
