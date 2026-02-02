@echo off
echo Creating route files...

cd src\app\api\analysis\[id]
echo import { NextRequest, NextResponse } from 'next/server' > route.ts
echo import { getServerSession } from 'next-auth' >> route.ts
echo import { authOptions } from '@/lib/auth' >> route.ts
echo import { ObjectId } from 'mongodb' >> route.ts
echo import clientPromise from '@/lib/db' >> route.ts
echo. >> route.ts
echo // Phase 2, Step 3: Create Analysis Data Fetcher >> route.ts
echo. >> route.ts
echo export async function GET( >> route.ts
echo   _request: NextRequest, >> route.ts
echo   { params }: { params: { id: string } } >> route.ts
echo ) { >> route.ts
echo   try { >> route.ts
echo     // Check authentication >> route.ts
echo     const session = await getServerSession(authOptions) >> route.ts
echo     if (!session ^|^| !session.user) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Not authenticated' }), >> route.ts
echo         { status: 401 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const { id } = params >> route.ts
echo. >> route.ts
echo     if (!id) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Project ID is required' }), >> route.ts
echo         { status: 400 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     // Connect to database >> route.ts
echo     const client = await clientPromise >> route.ts
echo     const db = client.db('test') >> route.ts
echo. >> route.ts
echo     // Query for analysis data >> route.ts
echo     // Convert id to ObjectId for the query >> route.ts
echo     let objectId: ObjectId >> route.ts
echo     try { >> route.ts
echo       objectId = new ObjectId(id) >> route.ts
echo     } catch (e) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Invalid project ID format' }), >> route.ts
echo         { status: 400 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const analysis = await db.collection('analyses').findOne({  >> route.ts
echo       projectId: objectId  >> route.ts
echo     }) >> route.ts
echo. >> route.ts
echo     if (!analysis) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Analysis not found' }), >> route.ts
echo         { status: 404 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     // Format the response >> route.ts
echo     const formattedAnalysis = { >> route.ts
echo       id: analysis._id.toString(), >> route.ts
echo       projectId: analysis.projectId.toString(), >> route.ts
echo       repositoryStructure: analysis.repositoryStructure ^|^| null, >> route.ts
echo       codeStructure: analysis.codeStructure ^|^| null, >> route.ts
echo       recommendations: analysis.recommendations ^|^| [], >> route.ts
echo       createdAt: analysis.createdAt, >> route.ts
echo       updatedAt: analysis.updatedAt >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     return NextResponse.json(formattedAnalysis) >> route.ts
echo   } catch (error: any) { >> route.ts
echo     console.error('Error fetching analysis data:', error) >> route.ts
echo     >> route.ts
echo     return new NextResponse( >> route.ts
echo       JSON.stringify({ error: error.message ^|^| 'Something went wrong' }), >> route.ts
echo       { status: 500 } >> route.ts
echo     ) >> route.ts
echo   } >> route.ts
echo } >> route.ts

cd ..\..\..\project-structure\[id]
echo import { NextRequest, NextResponse } from 'next/server' > route.ts
echo import { getServerSession } from 'next-auth' >> route.ts
echo import { authOptions } from '@/lib/auth' >> route.ts
echo import { ObjectId } from 'mongodb' >> route.ts
echo import clientPromise from '@/lib/db' >> route.ts
echo. >> route.ts
echo // Phase 2, Step 3: Create Project Structure Data Fetcher >> route.ts
echo. >> route.ts
echo export async function GET( >> route.ts
echo   _request: NextRequest,  >> route.ts
echo   { params }: { params: { id: string } } >> route.ts
echo ) { >> route.ts
echo   try { >> route.ts
echo     // Check authentication >> route.ts
echo     const session = await getServerSession(authOptions) >> route.ts
echo     if (!session ^|^| !session.user) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Not authenticated' }), >> route.ts
echo         { status: 401 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const { id } = params >> route.ts
echo. >> route.ts
echo     if (!id) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Project ID is required' }), >> route.ts
echo         { status: 400 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     // Connect to database >> route.ts
echo     const client = await clientPromise >> route.ts
echo     const db = client.db('test') >> route.ts
echo. >> route.ts
echo     // Query for project structure data >> route.ts
echo     // Convert id to ObjectId for the query >> route.ts
echo     let objectId: ObjectId >> route.ts
echo     try { >> route.ts
echo       objectId = new ObjectId(id) >> route.ts
echo     } catch (e) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Invalid project ID format' }), >> route.ts
echo         { status: 400 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const structure = await db.collection('projectStructures').findOne({  >> route.ts
echo       projectId: objectId  >> route.ts
echo     }) >> route.ts
echo. >> route.ts
echo     if (!structure) { >> route.ts
echo       return new NextResponse( >> route.ts
echo         JSON.stringify({ error: 'Project structure not found' }), >> route.ts
echo         { status: 404 } >> route.ts
echo       ) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     // Format the response >> route.ts
echo     const formattedStructure = { >> route.ts
echo       id: structure._id.toString(), >> route.ts
echo       projectId: structure.projectId.toString(), >> route.ts
echo       name: structure.name, >> route.ts
echo       description: structure.description, >> route.ts
echo       fileHierarchy: structure.fileHierarchy, >> route.ts
echo       dependencies: structure.dependencies ^|^| {}, >> route.ts
echo       buildConfig: structure.buildConfig ^|^| { >> route.ts
echo         commands: {}, >> route.ts
echo         environment: {} >> route.ts
echo       }, >> route.ts
echo       createdAt: structure.createdAt, >> route.ts
echo       updatedAt: structure.updatedAt >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     return NextResponse.json(formattedStructure) >> route.ts
echo   } catch (error: any) { >> route.ts
echo     console.error('Error fetching project structure:', error) >> route.ts
echo     >> route.ts
echo     return new NextResponse( >> route.ts
echo       JSON.stringify({ error: error.message ^|^| 'Something went wrong' }), >> route.ts
echo       { status: 500 } >> route.ts
echo     ) >> route.ts
echo   } >> route.ts
echo } >> route.ts

cd ..\..\..\chat\history\[id]
echo import { NextResponse } from 'next/server' > route.ts
echo import { getServerAuthSession } from '@/lib/auth' >> route.ts
echo import { clientPromise } from '@/lib/mongodb' >> route.ts
echo import { ObjectId } from 'mongodb' >> route.ts
echo. >> route.ts
echo export async function GET( >> route.ts
echo   _: Request, >> route.ts
echo   { params }: { params: { id: string } } >> route.ts
echo ) { >> route.ts
echo   try { >> route.ts
echo     const session = await getServerAuthSession() >> route.ts
echo     if (!session?.user) { >> route.ts
echo       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const client = await clientPromise >> route.ts
echo     const db = client.db('test') >> route.ts
echo. >> route.ts
echo     // Get chat history from projectState >> route.ts
echo     const projectState = await db.collection('projectState').findOne({ >> route.ts
echo       projectId: new ObjectId(params.id) >> route.ts
echo     }) >> route.ts
echo. >> route.ts
echo     return NextResponse.json({ messages: projectState?.chatHistory ^|^| [] }) >> route.ts
echo   } catch (error) { >> route.ts
echo     console.error('Error loading chat history:', error) >> route.ts
echo     return NextResponse.json( >> route.ts
echo       { error: 'Failed to load chat history' }, >> route.ts
echo       { status: 500 } >> route.ts
echo     ) >> route.ts
echo   } >> route.ts
echo } >> route.ts
echo. >> route.ts
echo export async function POST( >> route.ts
echo   request: Request, >> route.ts
echo   { params }: { params: { id: string } } >> route.ts
echo ) { >> route.ts
echo   try { >> route.ts
echo     const authSession = await getServerAuthSession() >> route.ts
echo     if (!authSession?.user) { >> route.ts
echo       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     const { messages } = await request.json() >> route.ts
echo     const client = await clientPromise >> route.ts
echo     const db = client.db('test') >> route.ts
echo. >> route.ts
echo     // Update only projectState with new chat history >> route.ts
echo     const result = await db.collection('projectState').updateOne( >> route.ts
echo       { projectId: new ObjectId(params.id) }, >> route.ts
echo       {  >> route.ts
echo         $set: {  >> route.ts
echo           chatHistory: messages, >> route.ts
echo           updatedAt: new Date() >> route.ts
echo         } >> route.ts
echo       }, >> route.ts
echo       { upsert: true } >> route.ts
echo     ) >> route.ts
echo. >> route.ts
echo     if (!result.acknowledged) { >> route.ts
echo       throw new Error('Failed to update chat history') >> route.ts
echo     } >> route.ts
echo. >> route.ts
echo     return NextResponse.json({ success: true }) >> route.ts
echo   } catch (error) { >> route.ts
echo     console.error('Error saving chat history:', error) >> route.ts
echo     return NextResponse.json( >> route.ts
echo       { error: 'Failed to save chat history' }, >> route.ts
echo       { status: 500 } >> route.ts
echo     ) >> route.ts
echo   } >> route.ts
echo } >> route.ts

echo Done! 