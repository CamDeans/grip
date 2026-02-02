import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/utils/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { BuildLog, IBuildLogData } from '@/lib/models';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    const projectId = url.searchParams.get('projectId');
    const taskType = url.searchParams.get('taskType');
    const status = url.searchParams.get('status');
    const phase = url.searchParams.get('phase');
    const step = url.searchParams.get('step');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // If taskId is provided, return a single log
    if (taskId) {
      const log = await (BuildLog as any).findOne({ taskId }).lean();
      
      if (!log) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }
      
      return NextResponse.json(log);
    }
    
    // Otherwise, return filtered logs for a project
    const query: any = {};
    
    // Add filters if provided
    if (projectId) {
      try {
        query.projectId = new ObjectId(projectId);
      } catch (e) {
        // If projectId is not a valid ObjectId, just use it as a string
        query.projectId = projectId;
      }
    }
    
    if (taskType) query.taskType = taskType;
    if (status) query.status = status;
    if (phase) query['metadata.phase'] = phase;
    if (step) query['metadata.step'] = step;
    
    // Query logs
    const logs = await (BuildLog as any).find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    
    // Process logs to add phase and step directly on the object for easier access
    const processedLogs = logs.map((log: IBuildLogData) => ({
      ...log,
      phase: log.metadata?.phase || null,
      step: log.metadata?.step || null
    }));
    
    // Return logs
    return NextResponse.json({ logs: processedLogs });
  } catch (error) {
    console.error('Error fetching build logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch build logs' },
      { status: 500 }
    );
  }
} 