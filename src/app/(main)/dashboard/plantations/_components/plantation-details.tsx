"use client"

import { useState, useEffect } from "react"
import { X, Edit, MapPin, Calendar, Mountain, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { Plantation, Worker, HarvestRecordWithWorker } from "@/types/database"
import { formatCurrency } from "@/lib/utils"

interface PlantationDetailsProps {
  plantation: Plantation
  onClose: () => void
  onEdit: () => void
}

export function PlantationDetails({ plantation, onClose, onEdit }: PlantationDetailsProps) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [recentHarvests, setRecentHarvests] = useState<HarvestRecordWithWorker[]>([])
  const [stats, setStats] = useState({
    totalWorkers: 0,
    monthlyHarvest: 0,
    avgDailyOutput: 0,
    lastHarvestDate: null as string | null,
  })

  useEffect(() => {
    fetchPlantationData()
  }, [plantation.id])

  const fetchPlantationData = async () => {
    try {
      // Fetch workers
      const { data: workersData } = await supabase
        .from('workers')
        .select('*')
        .eq('plantation_id', plantation.id)
        .eq('status', 'active')

      // Fetch recent harvests
      const { data: harvestsData } = await supabase
        .from('harvest_records')
        .select('*, worker:workers(first_name, last_name)')
        .eq('plantation_id', plantation.id)
        .order('harvest_date', { ascending: false })
        .limit(10)

      // Calculate stats
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const { data: monthlyHarvestData } = await supabase
        .from('harvest_records')
        .select('quantity_kg')
        .eq('plantation_id', plantation.id)
        .gte('harvest_date', firstDayOfMonth.toISOString().split('T')[0])

      const totalMonthlyHarvest = monthlyHarvestData?.reduce((sum, record) => sum + record.quantity_kg, 0) || 0
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
      const currentDay = currentMonth.getDate()

      setWorkers(workersData || [])
      setRecentHarvests(harvestsData || [])
      setStats({
        totalWorkers: workersData?.length || 0,
        monthlyHarvest: totalMonthlyHarvest,
        avgDailyOutput: totalMonthlyHarvest / currentDay,
        lastHarvestDate: harvestsData?.[0]?.harvest_date || null,
      })
    } catch (error) {
      console.error('Error fetching plantation data:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{plantation.name}</CardTitle>
                <Badge variant={plantation.status === 'active' ? 'default' : 'secondary'}>
                  {plantation.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4" />
                {plantation.location}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="default" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workers">Workers</TabsTrigger>
              <TabsTrigger value="harvest">Harvest</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.totalWorkers}</div>
                    <p className="text-sm text-muted-foreground">Active Workers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.monthlyHarvest.toFixed(0)} kg</div>
                    <p className="text-sm text-muted-foreground">Monthly Harvest</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{stats.avgDailyOutput.toFixed(1)} kg</div>
                    <p className="text-sm text-muted-foreground">Avg Daily Output</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{plantation.area_hectares}</div>
                    <p className="text-sm text-muted-foreground">Hectares</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Plantation Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Leaf className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Tea Variety</p>
                        <p className="text-sm text-muted-foreground">{plantation.tea_variety}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mountain className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Altitude</p>
                        <p className="text-sm text-muted-foreground">{plantation.altitude_meters}m above sea level</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Established</p>
                        <p className="text-sm text-muted-foreground">
                          {plantation.established_date ? new Date(plantation.established_date).toLocaleDateString() : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-amber-600 rounded-sm" />
                      <div>
                        <p className="font-medium">Soil Type</p>
                        <p className="text-sm text-muted-foreground">{plantation.soil_type || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Workers ({stats.totalWorkers})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workers.map((worker) => (
                      <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{worker.first_name} {worker.last_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {worker.role} • {worker.employee_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {worker.salary ? formatCurrency(worker.salary) : 'Salary not set'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {worker.hire_date ? `Since ${new Date(worker.hire_date).getFullYear()}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {workers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No workers assigned to this plantation</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="harvest" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Harvest Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentHarvests.map((harvest) => (
                      <div key={harvest.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(harvest.harvest_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {harvest.worker?.first_name} {harvest.worker?.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{harvest.quantity_kg} kg</p>
                          <Badge variant={harvest.grade === 'A' ? 'default' : harvest.grade === 'B' ? 'secondary' : 'destructive'}>
                            Grade {harvest.grade}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {recentHarvests.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No harvest records found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Plantation ID</Label>
                      <p className="font-mono text-sm">{plantation.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Manager ID</Label>
                      <p className="font-mono text-sm">{plantation.manager_id || 'Not assigned'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p className="text-sm">{new Date(plantation.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{new Date(plantation.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function Label({ className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props} />
}