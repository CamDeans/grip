import { Octokit } from '@octokit/rest'
import { cache } from 'react'
import { getServerAuthSession } from './auth'
import { clientPromise } from './mongodb'
import { ObjectId } from 'mongodb'

// Create authenticated Octokit instance
const createOctokit = async () => {
  const session = await getServerAuthSession()
  const client = await clientPromise
  const db = client.db()
  
  const user = await db.collection('users').findOne({ 
    _id: session?.user?.id ? new ObjectId(session.user.id) : undefined 
  })

  return new Octokit({
    auth: user?.githubToken || process.env.GITHUB_ACCESS_TOKEN,
    request: {
      retries: 3,
      retryAfter: 5
    }
  })
}

// Cache results for 5 minutes
const CACHE_TTL = 5 * 60 * 1000

// Cache for repository content
const contentCache = new Map<string, { data: any; timestamp: number }>()

export const getRepositoryContent = cache(async (owner: string, repo: string, path: string = '') => {
  try {
    // Check cache first
    const cacheKey = `${owner}/${repo}/${path}`
    const cached = contentCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    const octokit = await createOctokit()

    // Add delay between requests to avoid rate limits
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    await delay(1000)

    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    // Cache the result
    contentCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    })

    return response.data
  } catch (error: any) {
    if (error.status === 403 && error.message.includes('rate limit')) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.')
    }
    if (error.status === 429) {
      throw new Error('Too many requests to GitHub. Please wait a few minutes.')
    }
    console.error('GitHub API error:', error)
    throw new Error('Failed to fetch repository content')
  }
})

export const getRepositoryContentServer = async (owner: string, repo: string, path: string = '') => {
  try {
    const octokit = await createOctokit()
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })
    return response.data
  } catch (error) {
    console.error('GitHub content error:', error)
    throw error
  }
}

export async function getAllFiles(owner: string, repo: string, path: string = ''): Promise<any[]> {
  try {
    const content = await getRepositoryContent(owner, repo, path)
    const files: any[] = []

    for (const item of Array.isArray(content) ? content : [content]) {
      if (item.type === 'file') {
        files.push(item)
      } else if (item.type === 'dir') {
        const subFiles = await getAllFiles(owner, repo, item.path)
        files.push(...subFiles)
      }
    }

    return files
  } catch (error) {
    console.error('Error getting all files:', error)
    throw error
  }
}

export async function searchRepositoriesServer(query: string) {
  try {
    const octokit = await createOctokit()

    const response = await octokit.search.repos({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: 10
    })

    return response.data.items.map(repo => ({
      id: repo.id,
      full_name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      language: repo.language
    }))
  } catch (error) {
    console.error('GitHub search error:', error)
    throw new Error('Failed to search repositories')
  }
}

export async function cloneRepository(owner: string, repo: string) {
  console.log('Cloning repository from GitHub')
  try {
    const files = await getAllFiles(owner, repo)
    console.log(`Cloned ${files.length} files`)
    return files
  } catch (error) {
    console.error('Repository cloning error:', error)
    throw error
  }
}
