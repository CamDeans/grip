import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { BuildLog } from '@/lib/models';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      taskId, 
      projectId, 
      taskType, 
      status, 
      command, 
      startTime, 
      output, 
      environment, 
      metadata 
    } = body;

    // Validate required fields
    if (!taskId || !projectId || !taskType || !status || !command) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    let projectObjectId;
    try {
      projectObjectId = new ObjectId(projectId);
    } catch (e) {
      // If projectId is not a valid ObjectId, just use it as a string
      projectObjectId = projectId;
    }

    // Create new build log
    const buildLog = await BuildLog.create({
      taskId,
      projectId: projectObjectId,
      taskType,
      status,
      command,
      startTime: startTime || new Date(),
      output: output || '',
      environment: environment || {},
      metadata: {
        triggeredBy: metadata?.triggeredBy || 'system',
        phase: metadata?.phase || '',
        step: metadata?.step || '',
        ...(metadata || {}),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Return success
    return NextResponse.json(
      { success: true, taskId: buildLog.taskId }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating build log:', error);
    return NextResponse.json(
      { error: 'Failed to create build log' }, 
      { status: 500 }
    );
  }
} 