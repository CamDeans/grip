import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { BuildLog } from '@/lib/models';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Build query
    const query: any = {};
    
    // Add filters if provided
    if (projectId && projectId !== 'all') {
      try {
        query.projectId = new ObjectId(projectId);
      } catch (e) {
        // If projectId is not a valid ObjectId, just use it as a string
        query.projectId = projectId;
      }
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Query build logs
    const builds = await BuildLog.find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .lean()
      .exec();
    
    // If no builds are found, return mock data for development
    if (!builds || builds.length === 0) {
      // Mock data for development purposes
      const mockBuilds = [
        {
          _id: '1',
          projectId: projectId || 'development',
          taskId: "task_00000000-0000-0000-0000-000000000001",
          taskType: 'build',
          status: 'completed',
          command: 'npm run build',
          startTime: new Date(Date.now() - 3600000), // 1 hour ago
          endTime: new Date(Date.now() - 3500000),   // 58 minutes ago
          duration: 100000, // 100 seconds
          output: 'Build completed successfully',
          exitCode: 0,
          phase: 'deployment',
          step: 'build',
        },
        {
          _id: '2',
          projectId: projectId || 'development',
          taskId: "task_00000000-0000-0000-0000-000000000002",
          taskType: 'test',
          status: 'failed',
          command: 'npm run test',
          startTime: new Date(Date.now() - 7200000), // 2 hours ago
          endTime: new Date(Date.now() - 7150000),   // 1 hour 59 minutes ago
          duration: 50000, // 50 seconds
          output: 'Tests failed: 2 of 10 tests failing',
          exitCode: 1,
          phase: 'testing',
          step: 'unit-tests',
        },
        {
          _id: '3',
          projectId: projectId || 'development',
          taskId: "task_00000000-0000-0000-0000-000000000003",
          taskType: 'deploy',
          status: 'running',
          command: 'npm run deploy',
          startTime: new Date(), // Now
          output: 'Deploying to production...',
          phase: 'deployment',
          step: 'deploy',
        }
      ];
    
      return NextResponse.json({ builds: mockBuilds });
    }
    
    // Process builds to add phase and step directly on the object for easier access
    const processedBuilds = builds.map(build => ({
      ...build,
      phase: build.metadata?.phase || null,
      step: build.metadata?.step || null
    }));
    
    return NextResponse.json({ builds: processedBuilds });
  } catch (error) {
    console.error('Error fetching builds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch builds' },
      { status: 500 }
    );
  }
} 