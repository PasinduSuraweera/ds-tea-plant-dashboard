"use client"

import { useState, useEffect } from "react"
import { Plus, TrendingUp, Users, DollarSign, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { supabase } from "@/lib/supabase"
import { WorkerWithPlantation } from "@/types/database"
import { formatCurrency } from "@/lib/utils"
import { format, subDays } from "date-fns"

interface DailyPluckingRecord {
  id: string
  worker_id: string
  plantation_id: string
  employee_name: string
  date: string
  kg_plucked: number
  rate_per_kg: number
  wage_earned: number
  total_income: number
  notes?: string
}

interface DailyStats {
  totalKg: number
  totalIncome: number
  totalWorkers: number
  avgKgPerWorker: number
}

interface WeeklyTrend {
  day: string
  totalKg: number
  totalIncome: number
}

const weeklyTrendsConfig = {
  totalKg: {
    label: "Harvest (kg)",
    color: "hsl(var(--chart-1))",
  },
  totalIncome: {
    label: "Income (LKR)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function DailyPluckingManager() {
  const [workers, setWorkers] = useState<WorkerWithPlantation[]>([])
  const [records, setRecords] = useState<DailyPluckingRecord[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats>({ totalKg: 0, totalIncome: 0, totalWorkers: 0, avgKgPerWorker: 0 })
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Form state
  const [formData, setFormData] = useState({
    worker_id: "",
    kg_plucked: "",
    rate_per_kg: "25", // Default rate per kg in LKR
    notes: "",
  })

  useEffect(() => {
    fetchWorkers()
    fetchDailyRecords()
    fetchDailyStats()
    fetchWeeklyTrends()
  }, [selectedDate])

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select(`
          *,
          plantation:plantations(id, name, location)
        `)
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_plucking')
        .select(`
          *,
          workers (first_name, last_name),
          plantations (name)
        `)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching daily records:', error)
        // Handle missing table gracefully
        if (error.message?.includes('relation "daily_plucking" does not exist')) {
          console.log('Daily plucking table not yet created')
          setRecords([])
          return
        }
        setRecords([])
        return
      }

      const processedRecords: DailyPluckingRecord[] = data?.map(record => ({
        id: record.id,
        worker_id: record.worker_id,
        plantation_id: record.plantation_id,
        employee_name: `${(record.workers as any)?.first_name || ''} ${(record.workers as any)?.last_name || ''}`.trim() || 'Unknown Worker',
        date: record.date,
        kg_plucked: record.kg_plucked || 0,
        rate_per_kg: record.rate_per_kg || 0,
        wage_earned: record.wage_earned || 0,
        total_income: record.total_income || 0,
        notes: record.notes,
      })) || []

      setRecords(processedRecords)
    } catch (error) {
      console.error('Error fetching daily records:', error)
      setRecords([])
    }
  }

  const fetchDailyStats = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_plucking')
        .select('kg_plucked, total_income, worker_id')
        .eq('date', selectedDate)

      if (error) {
        console.error('Error fetching daily stats:', error)
        // Handle missing table gracefully
        if (error.message?.includes('relation "daily_plucking" does not exist')) {
          setDailyStats({ totalKg: 0, totalIncome: 0, totalWorkers: 0, avgKgPerWorker: 0 })
          return
        }
        return
      }

      const totalKg = data?.reduce((sum, record) => sum + (record.kg_plucked || 0), 0) || 0
      const totalIncome = data?.reduce((sum, record) => sum + (record.total_income || 0), 0) || 0
      const totalWorkers = new Set(data?.map(record => record.worker_id)).size
      const avgKgPerWorker = totalWorkers > 0 ? totalKg / totalWorkers : 0

      setDailyStats({
        totalKg: Number(totalKg.toFixed(1)),
        totalIncome: Number(totalIncome.toFixed(2)),
        totalWorkers,
        avgKgPerWorker: Number(avgKgPerWorker.toFixed(1)),
      })
    } catch (error) {
      console.error('Error fetching daily stats:', error)
    }
  }

  const fetchWeeklyTrends = async () => {
    try {
      const today = new Date(selectedDate)
      const promises = []

      // Get data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        promises.push(
          supabase
            .from('daily_plucking')
            .select('kg_plucked, total_income')
            .eq('date', dateStr)
            .then(result => {
              // Handle missing table gracefully
              if (result.error?.message?.includes('relation "daily_plucking" does not exist')) {
                return { data: [], error: null }
              }
              return result
            })
        )
      }

      const results = await Promise.all(promises)
      
      const trendsData: WeeklyTrend[] = results.map((result, index) => {
        const date = subDays(today, 6 - index)
        const data = result.data || []
        
        const totalKg = data.reduce((sum, record) => sum + (record.kg_plucked || 0), 0)
        const totalIncome = data.reduce((sum, record) => sum + (record.total_income || 0), 0)

        return {
          day: format(date, 'EEE'),
          totalKg: Number(totalKg.toFixed(1)),
          totalIncome: Number(totalIncome.toFixed(2)),
        }
      })

      setWeeklyTrends(trendsData)
    } catch (error) {
      console.error('Error fetching weekly trends:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const kg_plucked = parseFloat(formData.kg_plucked)
    const rate_per_kg = parseFloat(formData.rate_per_kg)
    const wage_earned = kg_plucked * rate_per_kg
    const total_income = wage_earned

    const selectedWorker = workers.find(w => w.id === formData.worker_id)
    if (!selectedWorker) {
      alert('Please select a worker')
      return
    }

    try {
      const { data, error } = await supabase
        .from('daily_plucking')
        .insert({
          worker_id: formData.worker_id,
          plantation_id: selectedWorker.plantation_id,
          date: selectedDate,
          kg_plucked,
          rate_per_kg,
          wage_earned,
          total_income,
          notes: formData.notes || null,
        })
        .select()

      if (error) throw error

      // Reset form
      setFormData({
        worker_id: "",
        kg_plucked: "",
        rate_per_kg: "25",
        notes: "",
      })

      // Refresh data
      fetchDailyRecords()
      fetchDailyStats()
      fetchWeeklyTrends()

      alert('Record saved successfully!')
    } catch (error) {
      console.error('Error saving record:', error)
      alert('Error saving record. Please try again.')
    }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const { error } = await supabase
        .from('daily_plucking')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      // Refresh data
      fetchDailyRecords()
      fetchDailyStats()
      fetchWeeklyTrends()

      alert('Record deleted successfully!')
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Error deleting record. Please try again.')
    }
  }

  const getWorkerDisplayName = (worker: WorkerWithPlantation) => {
    return `${worker.first_name} ${worker.last_name} (${worker.employee_id})`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Plucking Records</h2>
          <p className="text-muted-foreground">Record daily tea plucking and manage worker wages</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="date">Date:</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Harvest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.totalKg} kg</div>
            <p className="text-xs text-muted-foreground">Today's plucking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dailyStats.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.totalWorkers}</div>
            <p className="text-xs text-muted-foreground">Working today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Worker</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats.avgKgPerWorker} kg</div>
            <p className="text-xs text-muted-foreground">Average harvest</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Harvest Trends</CardTitle>
          <CardDescription>Daily harvest and income over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={weeklyTrendsConfig} className="min-h-[300px] w-full">
            <AreaChart
              accessibilityLayer
              data={weeklyTrends}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="totalKg"
                type="natural"
                fill="var(--color-totalKg)"
                fillOpacity={0.4}
                stroke="var(--color-totalKg)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Daily Plucking</CardTitle>
          <CardDescription>Enter daily plucking data for workers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="worker">Worker *</Label>
                <Select
                  value={formData.worker_id}
                  onValueChange={(value) => setFormData({...formData, worker_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {getWorkerDisplayName(worker)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kg_plucked">KG Plucked *</Label>
                <Input
                  id="kg_plucked"
                  type="number"
                  step="0.1"
                  value={formData.kg_plucked}
                  onChange={(e) => setFormData({...formData, kg_plucked: e.target.value})}
                  placeholder="e.g., 15.5"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rate_per_kg">Rate per KG (LKR - රු) *</Label>
                <Input
                  id="rate_per_kg"
                  type="number"
                  step="0.01"
                  value={formData.rate_per_kg}
                  onChange={(e) => setFormData({...formData, rate_per_kg: e.target.value})}
                  placeholder="e.g., 25.00"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about the work..."
                rows={2}
              />
            </div>
            
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Daily Records */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Records ({format(new Date(selectedDate), 'PPP')})</CardTitle>
          <CardDescription>Daily plucking records for selected date</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No records found for this date
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{record.employee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.kg_plucked} kg × {formatCurrency(record.rate_per_kg)} = {formatCurrency(record.wage_earned)}
                    </p>
                    {record.notes && (
                      <p className="text-sm text-muted-foreground italic mt-1">
                        Note: {record.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(record.total_income)}</p>
                      <p className="text-sm text-muted-foreground">Total Income</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Daily Summary */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Daily Total:</span>
                  <div className="text-right">
                    <div>{dailyStats.totalKg} kg</div>
                    <div>{formatCurrency(dailyStats.totalIncome)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}