'use client'

import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { 
  AlertTriangleIcon, 
  SaveIcon, 
  RefreshCcwIcon, 
  ShieldIcon, 
  DatabaseIcon
} from 'lucide-react'

export default function AdminSettingsPage() {
  // Admin settings state
  const [settings, setSettings] = useState({
    enableLogging: true,
    enableErrorReporting: true,
    enableAutomation: true,
    enableAnalytics: false,
    enableBackups: true,
    debugMode: false,
    maintenanceMode: false
  })
  
  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting]
    })
  }
  
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSave = () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
    }, 1000)
  }
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCcwIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SaveIcon className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldIcon className="h-5 w-5 mr-2 text-amber-500" />
                System Security
              </CardTitle>
              <CardDescription>
                Configure system security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance-mode" className="flex flex-col space-y-1">
                  <span>Maintenance Mode</span>
                  <span className="text-sm text-muted-foreground">
                    Temporarily disable all system automation
                  </span>
                </Label>
                <Switch 
                  id="maintenance-mode" 
                  checked={settings.maintenanceMode}
                  onCheckedChange={() => toggleSetting('maintenanceMode')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-automation" className="flex flex-col space-y-1">
                  <span>Enable Automation</span>
                  <span className="text-sm text-muted-foreground">
                    Allow automated task execution
                  </span>
                </Label>
                <Switch 
                  id="enable-automation" 
                  checked={settings.enableAutomation}
                  onCheckedChange={() => toggleSetting('enableAutomation')}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DatabaseIcon className="h-5 w-5 mr-2 text-primary" />
                Data Management
              </CardTitle>
              <CardDescription>
                Configure data and logging settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-logging" className="flex flex-col space-y-1">
                  <span>Enable Logging</span>
                  <span className="text-sm text-muted-foreground">
                    Track system events and actions
                  </span>
                </Label>
                <Switch 
                  id="enable-logging" 
                  checked={settings.enableLogging}
                  onCheckedChange={() => toggleSetting('enableLogging')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-backups" className="flex flex-col space-y-1">
                  <span>Enable Backups</span>
                  <span className="text-sm text-muted-foreground">
                    Automatically backup system data
                  </span>
                </Label>
                <Switch 
                  id="enable-backups" 
                  checked={settings.enableBackups}
                  onCheckedChange={() => toggleSetting('enableBackups')}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangleIcon className="h-5 w-5 mr-2 text-destructive" />
                Developer Options
              </CardTitle>
              <CardDescription>
                Advanced settings for development and troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="debug-mode" className="flex flex-col space-y-1">
                  <span>Debug Mode</span>
                  <span className="text-sm text-muted-foreground">
                    Enable detailed debugging information
                  </span>
                </Label>
                <Switch 
                  id="debug-mode" 
                  checked={settings.debugMode}
                  onCheckedChange={() => toggleSetting('debugMode')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="error-reporting" className="flex flex-col space-y-1">
                  <span>Error Reporting</span>
                  <span className="text-sm text-muted-foreground">
                    Send error reports to developers
                  </span>
                </Label>
                <Switch 
                  id="error-reporting" 
                  checked={settings.enableErrorReporting}
                  onCheckedChange={() => toggleSetting('enableErrorReporting')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  )
} 