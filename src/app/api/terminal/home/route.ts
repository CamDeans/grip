import { NextResponse } from 'next/server'
import { homedir } from 'os'
import { getServerAuthSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const homeDir = homedir()
    return NextResponse.json({ homeDir })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get home directory' }, { status: 500 })
  }
} 
