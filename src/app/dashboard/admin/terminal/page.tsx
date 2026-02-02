'use client'

import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal } from '@/components/terminal/Terminal'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { PlusIcon } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export default function AdminTerminalPage() {
  const [terminals, setTerminals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const creatingTerminalRef = useRef(false)
  
  // Load existing terminals on mount
  useEffect(() => {
    const fetchTerminals = async () => {
      try {
        setLoading(true)
        
        // Try to fetch existing terminals
        const response = await fetch('/api/terminal');
        if (response.ok) {
          const data = await response.json();
          if (data.terminals && data.terminals.length > 0) {
            setTerminals(data.terminals);
          } else {
            // Only create a new terminal if we don't have any and aren't already creating one
            if (!creatingTerminalRef.current) {
              creatingTerminalRef.current = true;
              await handleAddTerminalInternal();
            }
          }
        } else {
          // Only create a fallback terminal if we're not already creating one
          if (!creatingTerminalRef.current) {
            creatingTerminalRef.current = true;
            await handleAddTerminalInternal();
          }
        }
      } catch (error) {
        console.error("Error fetching terminals:", error);
        // Only create a fallback terminal if we're not already creating one
        if (!creatingTerminalRef.current) {
          creatingTerminalRef.current = true;
          await handleAddTerminalInternal();
        }
      } finally {
        setLoading(false);
        creatingTerminalRef.current = false;
      }
    };
    
    fetchTerminals();
  }, []);
  
  // Internal helper function to avoid duplicate calls
  const handleAddTerminalInternal = async () => {
    try {
      // Create a new terminal session via API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: '000000000000000000000000'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.terminal && data.terminal.id) {
          setTerminals(prev => [...prev, data.terminal.id]);
          return data.terminal.id;
        }
      } else {
        // Fallback for error - use random UUID
        console.error("Failed to create terminal via API");
        const id = uuidv4();
        setTerminals(prev => [...prev, id]);
        return id;
      }
    } catch (error) {
      console.error("Error creating terminal:", error);
      // Fallback for error - use random UUID
      const id = uuidv4();
      setTerminals(prev => [...prev, id]);
      return id;
    }
    
    return null;
  }
  
  // Public function to add a terminal
  const handleAddTerminal = async () => {
    if (creatingTerminalRef.current) return;
    
    creatingTerminalRef.current = true;
    try {
      await handleAddTerminalInternal();
    } finally {
      creatingTerminalRef.current = false;
    }
  }
  
  const handleDeleteTerminal = async (id: string) => {
    try {
      // Delete the terminal from the server
      await fetch(`/api/terminal?terminalId=${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error("Error deleting terminal:", error);
    }
    
    // Remove from UI regardless of server response
    setTerminals(terminals.filter(termId => termId !== id));
  }
  
  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      </AdminDashboardLayout>
    );
  }
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Terminal Administration</h1>
          <Button onClick={handleAddTerminal} size="sm" disabled={creatingTerminalRef.current}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Terminal
          </Button>
        </div>
        
        <div className="grid gap-6">
          {terminals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p>No terminals available.</p>
                <Button onClick={handleAddTerminal} className="mt-4" disabled={creatingTerminalRef.current}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Terminal
                </Button>
              </CardContent>
            </Card>
          ) : (
            terminals.map(terminalId => (
              <Card key={terminalId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Terminal {terminalId.substring(0, 8)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <Terminal 
                      id={terminalId} 
                      onDelete={handleDeleteTerminal}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  )
} 