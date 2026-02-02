import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { startSystem, pauseSystem, getSystemState, updateSystemState } from "@/lib/services/systemControlService"

/**
 * GET: Retrieve task worker status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current system state
    await connectToDatabase()
    const systemState = await getSystemState()

    return NextResponse.json({
      status: systemState.isRunning ? "running" : "paused",
      concurrencyLimit: systemState.concurrencyLimit,
      maxTasksPerProject: systemState.maxTasksPerProject,
      taskPrioritization: systemState.taskPrioritization,
      errorHandlingMode: systemState.errorHandlingMode,
      maintenanceMode: systemState.maintenanceMode,
      timestamp: new Date()
    })
  } catch (error) {
    console.error("Error fetching task worker status:", error)
    return NextResponse.json(
      { error: "Failed to fetch task worker status" },
      { status: 500 }
    )
  }
}

/**
 * POST: Control task worker (start/pause/update)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get action from request body
    const data = await request.json()
    const { action, settings } = data

    // Validate action
    if (!action || !["start", "pause", "update"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Allowed actions: start, pause, update" },
        { status: 400 }
      )
    }

    let result = false
    
    // Execute action
    switch (action) {
      case "start":
        result = await startSystem()
        break
      case "pause":
        result = await pauseSystem()
        break
      case "update":
        if (!settings) {
          return NextResponse.json(
            { error: "Settings are required for update action" },
            { status: 400 }
          )
        }
        result = await updateSystemState(settings)
        break
    }

    if (!result) {
      return NextResponse.json(
        { error: `Failed to ${action} task worker` },
        { status: 500 }
      )
    }

    // Get updated state
    const systemState = await getSystemState()

    return NextResponse.json({
      message: `Task worker ${action === "update" ? "updated" : action === "start" ? "started" : "paused"} successfully`,
      status: systemState.isRunning ? "running" : "paused",
      concurrencyLimit: systemState.concurrencyLimit,
      maxTasksPerProject: systemState.maxTasksPerProject,
      taskPrioritization: systemState.taskPrioritization,
      errorHandlingMode: systemState.errorHandlingMode,
      maintenanceMode: systemState.maintenanceMode,
      timestamp: new Date()
    })
  } catch (error) {
    console.error(`Error controlling task worker:`, error)
    return NextResponse.json(
      { error: "Failed to control task worker" },
      { status: 500 }
    )
  }
}
