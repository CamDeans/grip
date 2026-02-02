import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    // Get timeframe from query parameters
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'
    
    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()
    
    // Calculate date range based on timeframe
    const now = new Date()
    const dateFrom = new Date()
    switch (timeframe) {
      case '24h':
        dateFrom.setHours(dateFrom.getHours() - 24)
        break
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7)
        break
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30)
        break
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90)
        break
      default:
        dateFrom.setDate(dateFrom.getDate() - 7)
    }
    
    // Query collections
    const [
      projects,
      buildLogs,
      terminalSessions,
      projectFiles
    ] = await Promise.all([
      db.collection('projects').find({}).toArray(),
      db.collection('buildLogs').find({
        createdAt: { $gte: dateFrom.toISOString() }
      }).toArray(),
      db.collection('terminalSessions').find({
        createdAt: { $gte: dateFrom.toISOString() }
      }).toArray(),
      db.collection('projectFiles').find({}).toArray()
    ])
    
    // Calculate project growth
    const prevDateFrom = new Date(dateFrom)
    switch (timeframe) {
      case '24h':
        prevDateFrom.setHours(prevDateFrom.getHours() - 24)
        break
      case '7d':
        prevDateFrom.setDate(prevDateFrom.getDate() - 7)
        break
      case '30d':
        prevDateFrom.setDate(prevDateFrom.getDate() - 30)
        break
      case '90d':
        prevDateFrom.setDate(prevDateFrom.getDate() - 90)
        break
    }
    
    const recentProjects = projects.filter((p: any) => 
      new Date(p.createdAt) >= dateFrom
    ).length
    
    const previousProjects = projects.filter((p: any) => 
      new Date(p.createdAt) >= prevDateFrom && new Date(p.createdAt) < dateFrom
    ).length
    
    const projectGrowth = {
      percentage: previousProjects === 0 
        ? recentProjects > 0 ? 100 : 0
        : Math.round((recentProjects - previousProjects) / previousProjects * 100),
      direction: recentProjects >= previousProjects ? 'up' : 'down'
    }
    
    // Generate activity data (count of actions per day)
    const activityData: Array<{ date: string, count: number }> = []
    const days = timeframe === '24h' ? 24 : 
                 timeframe === '7d' ? 7 : 
                 timeframe === '30d' ? 30 : 90
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      if (timeframe === '24h') {
        date.setHours(date.getHours() - i)
        date.setMinutes(0, 0, 0)
      } else {
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
      }
      
      const nextDate = new Date(date)
      if (timeframe === '24h') {
        nextDate.setHours(nextDate.getHours() + 1)
      } else {
        nextDate.setDate(nextDate.getDate() + 1)
      }
      
      const sessionsCount = terminalSessions.filter((s: any) => {
        const sessionDate = new Date(s.createdAt)
        return sessionDate >= date && sessionDate < nextDate
      }).length
      
      activityData.unshift({
        date: date.toISOString(),
        count: sessionsCount
      })
    }
    
    // Generate distribution data (projects by type/status)
    const distributionData = [
      {
        label: 'Active',
        value: projects.filter((p: any) => p.status === 'active').length
      },
      {
        label: 'Completed',
        value: projects.filter((p: any) => p.status === 'completed').length
      },
      {
        label: 'Archived',
        value: projects.filter((p: any) => p.status === 'archived').length
      }
    ]
    
    // Generate build status data
    const buildData = [
      {
        status: 'success',
        count: buildLogs.filter((b: any) => b.status === 'success').length
      },
      {
        status: 'failed',
        count: buildLogs.filter((b: any) => b.status === 'failed').length
      },
      {
        status: 'pending',
        count: buildLogs.filter((b: any) => b.status === 'pending').length
      },
      {
        status: 'canceled',
        count: buildLogs.filter((b: any) => b.status === 'canceled').length
      }
    ]
    
    // Generate language distribution data
    const languageCounts: Record<string, number> = {}
    projectFiles.forEach((file: any) => {
      if (file.language) {
        languageCounts[file.language] = (languageCounts[file.language] || 0) + 1
      }
    })
    
    const languageColors: Record<string, string> = {
      'typescript': '#3178c6',
      'javascript': '#f7df1e',
      'python': '#3776ab',
      'java': '#b07219',
      'go': '#00add8',
      'rust': '#dea584',
      'c': '#555555',
      'cpp': '#f34b7d',
      'csharp': '#178600',
      'php': '#4F5D95',
      'ruby': '#701516',
      'swift': '#ffac45',
      'kotlin': '#A97BFF',
      'html': '#e34c26',
      'css': '#563d7c',
      'json': '#292929',
      'markdown': '#083fa1',
      'yaml': '#cb171e',
      'other': '#8257e5',
    }
    
    const languageData = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Top 6 languages
      .map(([language, count]) => ({
        language: language.charAt(0).toUpperCase() + language.slice(1),
        count,
        color: languageColors[language.toLowerCase()] || languageColors.other
      }))
    
    // If there are no languages yet, provide some defaults for a better UX
    if (languageData.length === 0) {
      languageData.push(
        { language: 'TypeScript', count: 5, color: languageColors.typescript },
        { language: 'JavaScript', count: 3, color: languageColors.javascript },
        { language: 'HTML', count: 2, color: languageColors.html },
        { language: 'CSS', count: 2, color: languageColors.css }
      )
    }
    
    // Generate time data
    const totalHours = Math.floor(terminalSessions.reduce((total: number, session: any) => {
      const duration = session.duration || 0
      return total + duration
    }, 0) / 3600)
    
    const avgHours = terminalSessions.length > 0 ? totalHours / days : 0
    
    // Find peak hour
    const hourCounts: number[] = new Array(24).fill(0)
    terminalSessions.forEach((session: any) => {
      const date = new Date(session.createdAt)
      const hour = date.getHours()
      hourCounts[hour]++
    })
    
    const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts))
    const peakHour = peakHourIndex === -1 ? '--' : `${peakHourIndex}:00`
    
    const timeData = {
      total: totalHours,
      average: avgHours,
      peak: peakHour
    }
    
    // Assemble and return analytics data
    const analyticsData = {
      totalProjects: projects.length,
      projectGrowth,
      activityData,
      distributionData,
      buildData,
      languageData,
      timeData
    }
    
    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
} 
