"use client"

import { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { supabase } from "@/lib/supabase"
import { subDays, format, startOfDay, endOfDay } from "date-fns"

interface HarvestData {
  date: string
  totalKg: number
  income: number
  workers: number
}

const chartConfig = {
  totalKg: {
    label: "Harvest (kg)",
    color: "hsl(var(--chart-1))",
  },
  income: {
    label: "Income (LKR)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function HarvestTrendsChart() {
  const [harvestData, setHarvestData] = useState<HarvestData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHarvestData() {
      try {
        const today = new Date()
        const promises = []

      // Get data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        promises.push(
          supabase
            .from('daily_plucking')
            .select('kg_plucked, total_income, worker_id')
            .gte('date', format(startOfDay(date), 'yyyy-MM-dd'))
            .lte('date', format(endOfDay(date), 'yyyy-MM-dd'))
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
      
      const processedData: HarvestData[] = results.map((result, index) => {
          const date = subDays(today, 6 - index)
          const data = result.data || []
          
          const totalKg = data.reduce((sum, record) => sum + (record.kg_plucked || 0), 0)
          const income = data.reduce((sum, record) => sum + (record.total_income || 0), 0)
          const uniqueWorkers = new Set(data.map(record => record.worker_id)).size

          return {
            date: format(date, 'EEE'), // Mon, Tue, etc.
            totalKg: Number(totalKg.toFixed(1)),
            income: Number(income.toFixed(2)),
            workers: uniqueWorkers
          }
        })

        setHarvestData(processedData)
      } catch (error) {
        console.error('Error fetching harvest data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHarvestData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Harvest Trends</CardTitle>
          <CardDescription>Daily harvest quantities and earnings</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Harvest Trends</CardTitle>
        <CardDescription>
          Daily harvest quantities and earnings over the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={harvestData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
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
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Harvest trends over the past week <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Showing daily tea harvest quantities in kilograms
            </div>
          </div>
        </div>
      </CardFooter>
      {harvestData.length === 0 && (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          No harvest data available for the past 7 days
        </div>
      )}
    </Card>
  )
}