import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'

/** Map file extension or stored language key to a single display name for analytics. */
function extensionToLanguageName(extOrLang: string): string {
  if (!extOrLang || typeof extOrLang !== 'string') return 'Other'
  const lower = extOrLang.toLowerCase().trim()
  const map: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    json: 'JSON',
    md: 'Markdown',
    markdown: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    html: 'HTML',
    htm: 'HTML',
    yaml: 'YAML',
    yml: 'YAML',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    kt: 'Kotlin',
    swift: 'Swift',
    c: 'C',
    cpp: 'C++',
    cc: 'C++',
    cxx: 'C++',
    cs: 'C#',
    php: 'PHP',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Shell',
    zsh: 'Shell',
    plaintext: 'Other',
    txt: 'Plain text',
  }
  return map[lower] || (lower.charAt(0).toUpperCase() + lower.slice(1))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'

    const client = await clientPromise
    const db = client.db()

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

    // Only this user's projects
    const projects = await db.collection('projects').find({ userId: session.user.id }).toArray()
    const projectIds = projects.map((p: { _id: unknown }) => p._id)

    const [
      buildLogs,
      terminalSessions,
      projectFiles,
      analyses,
      chatHistories,
      projectStatesList
    ] = await Promise.all([
      projectIds.length > 0
        ? db.collection('buildLogs').find({
            projectId: { $in: projectIds },
            createdAt: { $gte: dateFrom.toISOString() }
          }).toArray()
        : [],
      projectIds.length > 0
        ? db.collection('terminalSessions').find({
            projectId: { $in: projectIds },
            createdAt: { $gte: dateFrom.toISOString() }
          }).toArray()
        : [],
      projectIds.length > 0
        ? db.collection('projectFiles').find({ projectId: { $in: projectIds } }).toArray()
        : [],
      projectIds.length > 0
        ? db.collection('analyses').find({ projectId: { $in: projectIds } }).toArray()
        : [],
      projectIds.length > 0
        ? db.collection('chatHistory').find({ projectId: { $in: projectIds } }).toArray()
        : [],
      projectIds.length > 0
        ? db.collection('projectStates').find({ projectId: { $in: projectIds } }).toArray()
        : []
    ])

    // Activity timeline: use file saves and builds (key GRIP usage), not terminal sessions
    const dateFromMs = dateFrom.getTime()
    const fileEvents = projectFiles
      .filter((f: any) => {
        const at = new Date(f.createdAt || f.updatedAt || 0).getTime()
        return at >= dateFromMs
      })
      .map((f: any) => ({ at: new Date(f.createdAt || f.updatedAt || 0).getTime() }))
    const buildEvents = buildLogs.map((b: any) => ({ at: new Date(b.createdAt || 0).getTime() }))
    
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
    
    // Generate activity data from file saves + builds (per day or per hour)
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
      
      const startMs = date.getTime()
      const endMs = nextDate.getTime()
      const fileCount = fileEvents.filter((e) => e.at >= startMs && e.at < endMs).length
      const buildCount = buildEvents.filter((e) => e.at >= startMs && e.at < endMs).length
      const activityCount = fileCount + buildCount
      
      activityData.unshift({
        date: date.toISOString(),
        count: activityCount
      })
    }
    
    // Generate distribution data (projects by type/status; treat missing status as active)
    const distributionData = [
      {
        label: 'Active',
        value: projects.filter((p: any) => (p.status ?? 'active') === 'active').length
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

    // Build summary: total and avg duration (we track duration in buildLogs; may be ms or seconds)
    const buildsWithDuration = buildLogs.filter((b: any) => b.duration != null && Number(b.duration) > 0)
    const totalBuilds = buildLogs.length
    const avgBuildDurationMs = buildsWithDuration.length > 0
      ? buildsWithDuration.reduce((sum: number, b: any) => sum + Number(b.duration), 0) / buildsWithDuration.length
      : null

    // Builds by task type (install, build, test, etc.) — what we track
    const taskTypeCounts: Record<string, number> = {}
    buildLogs.forEach((b: any) => {
      const t = (b.taskType || 'other').toString().toLowerCase()
      taskTypeCounts[t] = (taskTypeCounts[t] || 0) + 1
    })
    const buildDataByTaskType = Object.entries(taskTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([taskType, count]) => ({ taskType, count }))

    // Chat: total messages across projects, and how many projects had chat activity in period
    const totalChatMessages = chatHistories.reduce((sum: number, doc: any) => {
      const n = doc.metadata?.totalMessages ?? (Array.isArray(doc.messages) ? doc.messages.length : 0)
      return sum + Number(n || 0)
    }, 0)
    const lastUpdatedFrom = dateFrom.getTime()
    const chatActivityInPeriod = chatHistories.filter((doc: any) => {
      const t = doc.metadata?.lastUpdated ?? doc.metadata?.lastMessage
      return t && new Date(t).getTime() >= lastUpdatedFrom
    }).length

    // Plans: projects with phases/steps, total steps completed
    const projectsWithPlan = projectStatesList.filter((s: any) =>
      Array.isArray(s.phases) && s.phases.length > 0
    ).length
    let totalStepsCompleted = 0
    projectStatesList.forEach((s: any) => {
      if (!Array.isArray(s.phases)) return
      s.phases.forEach((p: any) => {
        if (Array.isArray(p.steps)) {
          totalStepsCompleted += p.steps.filter((st: any) => st.status === 'completed').length
        }
      })
    })
    
    // Generate language distribution from all project files and all analyses (all project creations)
    const languageCounts: Record<string, number> = {}

    // 1. From projectFiles: derive language from filename (path + filename) or fall back to stored file.language
    projectFiles.forEach((file: any) => {
      const filename = (file.filename || '').trim() || (file.path || '').split('/').pop() || ''
      const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : null
      const stored = (file.language || '').toLowerCase().trim()
      const name = ext
        ? extensionToLanguageName(ext)
        : stored && stored !== 'plaintext'
          ? extensionToLanguageName(stored)
          : null
      if (name && name !== 'Other') {
        languageCounts[name] = (languageCounts[name] || 0) + 1
      } else if (name === 'Other' && (ext || stored)) {
        languageCounts.Other = (languageCounts.Other || 0) + 1
      }
    })

    // 2. From analyses: merge repositoryStructure.languages and codeStructure.mainLanguages (extension -> count)
    analyses.forEach((doc: any) => {
      const repoLangs = doc.repositoryStructure?.languages || {}
      const mainLangs = doc.codeStructure?.mainLanguages || {}
      const merged: Record<string, number> = { ...repoLangs }
      Object.entries(mainLangs).forEach(([ext, count]) => {
        merged[ext] = (merged[ext] || 0) + Number(count)
      })
      Object.entries(merged).forEach(([ext, count]) => {
        const name = extensionToLanguageName(ext)
        if (name && count > 0) {
          languageCounts[name] = (languageCounts[name] || 0) + Number(count)
        }
      })
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
      'scss': '#cc6699',
      'sass': '#cc6699',
      'other': '#8257e5',
    }

    const languageData = Object.entries(languageCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12) // Top 12 so all detected languages can show
      .map(([language, count]) => ({
        language,
        count,
        color: languageColors[language.toLowerCase()] || languageColors.other
      }))

    // Only show placeholder when user has no projects or no files/analyses at all
    if (languageData.length === 0 && (projectFiles.length > 0 || analyses.length > 0)) {
      // Had data but no languages detected — keep empty or add Other
      languageData.push({ language: 'Other', count: 1, color: languageColors.other })
    } else if (languageData.length === 0) {
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
    
    // Active days: distinct days in period with at least one file save or build (same as activity timeline)
    const activeDaySet = new Set<number>()
    ;[...fileEvents, ...buildEvents].forEach((e) => {
      const d = new Date(e.at)
      d.setHours(0, 0, 0, 0)
      activeDaySet.add(d.getTime())
    })
    const activeDays = activeDaySet.size

    const timeData = {
      total: totalHours,
      average: avgHours,
      peak: peakHour,
      activeDays,
    }
    
    // Full project details for analytics page (titles, status, createdAt)
    const projectsDetail = projects.map((p: { _id: unknown; title?: string; description?: string; status?: string; createdAt?: string }) => ({
      id: p._id,
      title: p.title,
      description: p.description,
      status: p.status ?? 'active',
      createdAt: p.createdAt
    }))

    // Code generated = project files saved (from Plan or Develop), not build count
    const filesGenerated = projectFiles.length

    const analyticsData = {
      totalProjects: projects.length,
      projectGrowth,
      activityData,
      distributionData,
      buildData,
      buildDataByTaskType,
      buildSummary: { totalBuilds, avgDurationMs: avgBuildDurationMs },
      chatSummary: { totalChatMessages, chatActivityInPeriod },
      planSummary: { projectsWithPlan, totalStepsCompleted },
      languageData,
      timeData,
      projectsDetail,
      filesGenerated,
      repoAnalysesCount: analyses.length,
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
