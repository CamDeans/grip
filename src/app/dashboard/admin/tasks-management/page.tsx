'use client'

export default function TasksManagementPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Task Manager</h1>
      
      <div className="p-6 border rounded-md bg-background-secondary">
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="text-4xl">📋</div>
          <p className="text-xl font-medium">Task Management</p>
          <p className="text-text-secondary">Monitor and manage your automation tasks</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => window.history.back()}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
} 