import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, BuildLog } from '@/lib/models';
import { ProjectAutomationService } from '@/lib/services/projectAutomationService';
import { ITask, ITaskData } from '@/lib/models/Task';
import { IBuildLog } from '@/lib/models/BuildLog';
import mongoose from 'mongoose';

/**
 * Debug API endpoint to help diagnose task issues
 * GET /api/admin/tasks/debug
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get query parameters
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const taskType = url.searchParams.get('taskType') || 'generate';
    const status = url.searchParams.get('status') || 'running';
    
    // Prepare queries
    const query: Record<string, any> = {};
    if (projectId) {
      try {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      } catch (e) {
        // If not a valid ObjectId, use as string
        query.projectId = projectId;
      }
    }
    if (taskType) {
      query.type = taskType;
    }
    if (status) {
      query.status = status;
    }
    
    // Fetch tasks with the specified criteria
    const tasks = await Task.find(query)
      .sort({ startTime: -1 })
      .limit(10)
      .exec();
    
    // Fetch corresponding build logs for each task
    const buildLogs: Array<Partial<IBuildLog> & { outputLength?: number }> = [];
    
    // If no tasks found, try fetching build logs directly instead
    if (tasks.length === 0) {
      const buildLogQuery: Record<string, any> = {};
      if (projectId) {
        try {
          buildLogQuery.projectId = new mongoose.Types.ObjectId(projectId);
        } catch (e) {
          buildLogQuery.projectId = projectId;
        }
      }
      if (taskType) {
        buildLogQuery.taskType = taskType;
      }
      if (status) {
        buildLogQuery.status = status;
      }
      
      const directLogs = await BuildLog.find(buildLogQuery)
        .sort({ startTime: -1 })
        .limit(10)
        .exec();
        
      for (const log of directLogs) {
        buildLogs.push({
          taskId: log.taskId,
          status: log.status,
          command: log.command,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.duration,
          output: log.output?.substring(0, 500) + (log.output?.length > 500 ? '...' : ''),
          outputLength: log.output?.length || 0
        });
      }
    } else {
      for (const task of tasks) {
        try {
          // In Task model we need to access taskId from metadata or generate it if needed
          const taskId = task.taskId || `task_${task._id.toString()}`;
          const log = await BuildLog.findOne({ taskId }).exec();
          
          if (log) {
            buildLogs.push({
              taskId: log.taskId,
              status: log.status,
              command: log.command,
              startTime: log.startTime,
              endTime: log.endTime,
              duration: log.duration,
              output: log.output?.substring(0, 500) + (log.output?.length > 500 ? '...' : ''),
              outputLength: log.output?.length || 0
            });
          }
        } catch (error) {
          console.error('Error fetching build log:', error);
        }
      }
    }
    
    // Return debug information
    return NextResponse.json({
      tasks: tasks.map((task) => ({
        id: task._id.toString(),
        name: task.name,
        type: task.type,
        status: task.status,
        command: task.command,
        scheduledFor: task.scheduledFor,
        startTime: task.startTime,
        endTime: task.endTime,
        lastError: task.lastError
      })),
      buildLogs,
      buildLogCount: buildLogs.length,
      taskCount: tasks.length,
      query: query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error debugging tasks:', error);
    return NextResponse.json(
      { error: 'Failed to debug tasks', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 