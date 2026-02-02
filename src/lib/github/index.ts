import { Octokit } from '@octokit/rest'
import { clientPromise } from '../mongodb'
import { serializeDocument } from '../utils'
import { Document } from 'mongodb'

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})

export interface GitHubRepo extends Document {
  id: string
  name: string
  fullName: string
  description: string
  private: boolean
  url: string
  defaultBranch: string
  createdAt: Date
  updatedAt: Date
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
}

export interface GitHubCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: Date
  }
  url: string
}

export async function getRepository(owner: string, repo: string): Promise<GitHubRepo> {
  try {
    const response = await octokit.repos.get({
      owner,
      repo
    })

    return {
      id: response.data.id.toString(),
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description || '',
      private: response.data.private,
      url: response.data.html_url,
      defaultBranch: response.data.default_branch,
      createdAt: new Date(response.data.created_at),
      updatedAt: new Date(response.data.updated_at)
    }
  } catch (error) {
    console.error('Error getting repository:', error)
    throw error
  }
}

export async function getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
  try {
    const response = await octokit.repos.listBranches({
      owner,
      repo
    })

    return response.data.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url
      }
    }))
  } catch (error) {
    console.error('Error getting branches:', error)
    throw error
  }
}

export async function getCommits(owner: string, repo: string, branch: string): Promise<GitHubCommit[]> {
  try {
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch
    })

    return response.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || '',
        email: commit.commit.author?.email || '',
        date: new Date(commit.commit.author?.date || Date.now())
      },
      url: commit.html_url
    }))
  } catch (error) {
    console.error('Error getting commits:', error)
    throw error
  }
}

export async function createRepository(name: string, description: string, isPrivate: boolean = true) {
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true
    })

    const repo: GitHubRepo = {
      id: response.data.node_id,
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description || '',
      private: response.data.private,
      url: response.data.html_url,
      defaultBranch: response.data.default_branch,
      createdAt: new Date(response.data.created_at),
      updatedAt: new Date(response.data.updated_at)
    }

    // Save to database
    const client = await clientPromise
    const db = client.db()
    await db.collection<GitHubRepo>('repositories').insertOne(serializeDocument(repo) as GitHubRepo)

    return repo
  } catch (error) {
    console.error('Error creating repository:', error)
    throw error
  }
}

export {
  octokit
} 