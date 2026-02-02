import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/utils/auth';
import { seedAllData, seedSampleFiles, seedSampleBuildLogs, seedSampleProjectStructure } from '@/lib/db/seedData';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      projectId, 
      dataType = 'all', 
      environment = process.env.NODE_ENV || 'development'
    } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' }, 
        { status: 400 }
      );
    }

    // Seed data based on the dataType
    let result;
    
    switch (dataType) {
      case 'buildLogs':
        result = await seedSampleBuildLogs(
          environment as 'development' | 'production' | 'all', 
          projectId
        );
        break;
        
      case 'files':
        result = await seedSampleFiles(
          environment as 'development' | 'production' | 'all', 
          projectId
        );
        break;
        
      case 'projectStructure':
        result = await seedSampleProjectStructure(
          environment as 'development' | 'production' | 'all', 
          projectId
        );
        break;
        
      case 'all':
      default:
        result = await seedAllData(
          environment as 'development' | 'production' | 'all', 
          projectId
        );
        break;
    }
    
    // Return success
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully seeded ${dataType} data for project ${projectId}`,
        result
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Failed to seed data' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return information about the seeding API
  return NextResponse.json({
    message: 'Data Seeding API',
    usage: {
      method: 'POST',
      body: {
        projectId: 'Required - The ID of the project to seed data for',
        dataType: 'Optional - Type of data to seed (all, buildLogs, files, projectStructure)',
        environment: 'Optional - Environment to seed for (development, production, all)'
      }
    }
  });
} 