import { NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { Document, WithId } from 'mongodb'

interface Project {
  _id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

interface BuildLog {
  _id: string;
  projectId: string;
  status: string;
  timestamp: string;
}

interface TerminalSession {
  _id: string;
  projectId: string;
  createdAt: string;
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // Query the collections in parallel for better performance
    const [
      projects,
      buildLogs,
      terminalSessions
    ] = await Promise.all([
      db.collection('projects').find({}).toArray(),
      db.collection('buildLogs').find({}).toArray(),
      db.collection('terminalSessions').find({}).toArray()
    ])
    
    // Calculate dashboard statistics using a safer approach
    const activeProjects = projects.filter(p => (p as any).status === 'active').length
    const completedProjects = projects.filter(p => (p as any).status === 'completed').length
    const totalProjects = projects.length
    const totalBuilds = buildLogs.length
    const terminalSessionCount = terminalSessions.length
    
    // If there are no projects yet, provide default values for a better user experience
    const stats = {
      activeProjects: activeProjects || 0,
      completedProjects: completedProjects || 0,
      totalProjects: totalProjects || 0,
      totalBuilds: totalBuilds || 0,
      terminalSessions: terminalSessionCount || 0,
    }
    
    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
} 