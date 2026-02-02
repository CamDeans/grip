import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { BuildLog } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { taskId, status, output, endTime } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing required field: taskId' }, 
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the existing log
    const log = await BuildLog.findOne({ taskId });

    if (!log) {
      return NextResponse.json(
        { error: 'Build log not found' }, 
        { status: 404 }
      );
    }

    // Update fields if provided
    const updateData: any = { updatedAt: new Date() };
    
    if (status) updateData.status = status;
    if (output) updateData.output = output;
    if (endTime) updateData.endTime = new Date(endTime);
    
    // Calculate duration if we have both start and end times
    if (endTime && log.startTime) {
      const endTimeDate = new Date(endTime);
      const startTimeDate = new Date(log.startTime);
      updateData.duration = endTimeDate.getTime() - startTimeDate.getTime();
    }

    // Update the log
    const updatedLog = await BuildLog.findOneAndUpdate(
      { taskId },
      { $set: updateData },
      { new: true }
    );

    // Return success
    return NextResponse.json({
      success: true,
      log: updatedLog
    });
  } catch (error) {
    console.error('Error updating build log:', error);
    return NextResponse.json(
      { error: 'Failed to update build log' }, 
      { status: 500 }
    );
  }
} 