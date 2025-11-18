"use client"

import { useEffect, useState } from "react"
import { Leaf, Users, Package, TrendingUp, Thermometer, Droplets } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { startOfDay, startOfMonth, endOfDay, endOfMonth, subDays, format } from "date-fns"

interface PlantationStats {
  totalPlantations: number
  activeWorkers: number
  todaysHarvest: number
  yesterdaysHarvest: number
  monthlyRevenue: number
  lastMonthRevenue: number
  averageTemperature: number
  rainfall: number
}

export function PlantationOverview() {
  const [stats, setStats] = useState<PlantationStats>({
    totalPlantations: 0,
    activeWorkers: 0,
    todaysHarvest: 0,
    yesterdaysHarvest: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    averageTemperature: 0,
    rainfall: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date()
        const yesterday = subDays(today, 1)
        const startOfCurrentMonth = startOfMonth(today)
        const endOfCurrentMonth = endOfMonth(today)
        const startOfLastMonth = startOfMonth(subDays(startOfCurrentMonth, 1))
        const endOfLastMonth = endOfMonth(subDays(startOfCurrentMonth, 1))

        // Get total plantations
        const { count: plantationsCount } = await supabase
          .from('plantations')
          .select('*', { count: 'exact', head: true })

        // Get active workers
        const { count: workersCount } = await supabase
          .from('workers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        // Get today's harvest from daily plucking records
        const { data: todaysPlucking, error: todayError } = await supabase
          .from('daily_plucking')
          .select('kg_plucked')
          .gte('date', format(startOfDay(today), 'yyyy-MM-dd'))
          .lte('date', format(endOfDay(today), 'yyyy-MM-dd'))

        // Get yesterday's harvest for comparison
        const { data: yesterdaysPlucking, error: yesterdayError } = await supabase
          .from('daily_plucking')
          .select('kg_plucked')
          .gte('date', format(startOfDay(yesterday), 'yyyy-MM-dd'))
          .lte('date', format(endOfDay(yesterday), 'yyyy-MM-dd'))

        // Get current month revenue
        const { data: currentMonthData, error: currentMonthError } = await supabase
          .from('daily_plucking')
          .select('total_income')
          .gte('date', format(startOfCurrentMonth, 'yyyy-MM-dd'))
          .lte('date', format(endOfCurrentMonth, 'yyyy-MM-dd'))

        // Get last month revenue for comparison
        const { data: lastMonthData, error: lastMonthError } = await supabase
          .from('daily_plucking')
          .select('total_income')
          .gte('date', format(startOfLastMonth, 'yyyy-MM-dd'))
          .lte('date', format(endOfLastMonth, 'yyyy-MM-dd'))

        // If table doesn't exist, use empty arrays
        const handleMissingTable = (error: any) => {
          return error?.message?.includes('relation "daily_plucking" does not exist')
        }

        // Calculate totals (handle missing table gracefully)
        const todaysHarvest = !handleMissingTable(todayError) 
          ? todaysPlucking?.reduce((sum, record) => sum + (record.kg_plucked || 0), 0) || 0 
          : 0
        const yesterdaysHarvest = !handleMissingTable(yesterdayError)
          ? yesterdaysPlucking?.reduce((sum, record) => sum + (record.kg_plucked || 0), 0) || 0
          : 0
        const monthlyRevenue = !handleMissingTable(currentMonthError)
          ? currentMonthData?.reduce((sum, record) => sum + (record.total_income || 0), 0) || 0
          : 0
        const lastMonthRevenue = !handleMissingTable(lastMonthError)
          ? lastMonthData?.reduce((sum, record) => sum + (record.total_income || 0), 0) || 0
          : 0

        setStats({
          totalPlantations: plantationsCount || 0,
          activeWorkers: workersCount || 0,
          todaysHarvest,
          yesterdaysHarvest,
          monthlyRevenue,
          lastMonthRevenue,
          // Weather data would come from external API or manual entry
          averageTemperature: 22.5, // This could be from a weather service
          rainfall: 125.3, // This could be from a weather service
        })
      } catch (error) {
        console.error('Error fetching plantation stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Calculate percentage changes
  const harvestChange = stats.yesterdaysHarvest > 0 
    ? ((stats.todaysHarvest - stats.yesterdaysHarvest) / stats.yesterdaysHarvest * 100)
    : 0
  const revenueChange = stats.lastMonthRevenue > 0
    ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100)
    : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Plantations</CardTitle>
          <Leaf className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPlantations}</div>
          <p className="text-xs text-muted-foreground">Active plantations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeWorkers}</div>
          <p className="text-xs text-muted-foreground">Currently employed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Harvest</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todaysHarvest.toFixed(1)} kg</div>
          <p className={`text-xs ${
            harvestChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {harvestChange >= 0 ? '+' : ''}{harvestChange.toFixed(1)}% from yesterday
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
          <p className={`text-xs ${
            revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
          <Thermometer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageTemperature}°C</div>
          <p className="text-xs text-muted-foreground">Optimal range</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Rainfall</CardTitle>
          <Droplets className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rainfall} mm</div>
          <p className="text-xs text-muted-foreground">Above average</p>
        </CardContent>
      </Card>
    </div>
  )
}