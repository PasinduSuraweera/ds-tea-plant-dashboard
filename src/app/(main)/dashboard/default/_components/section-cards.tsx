"use client"

import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, subMonths, subDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const SL_TIMEZONE = 'Asia/Colombo'

function getSLDate() {
  return formatInTimeZone(new Date(), SL_TIMEZONE, 'yyyy-MM-dd')
}

interface DashboardStats {
  // Revenue from tea sales
  monthlyRevenue: number
  revenueChange: number
  // Expenses from salary payments
  monthlyExpenses: number
  expensesChange: number
  // Profit = Revenue - Expenses
  monthlyProfit: number
  profitChange: number
  // Today's harvest
  todaysHarvest: number
  harvestChange: number
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    revenueChange: 0,
    monthlyExpenses: 0,
    expensesChange: 0,
    monthlyProfit: 0,
    profitChange: 0,
    todaysHarvest: 0,
    harvestChange: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date()
        const todayStr = getSLDate()
        const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')
        const currentMonth = startOfMonth(today)
        const currentMonthEnd = endOfMonth(today)
        const lastMonth = subMonths(currentMonth, 1)
        const lastMonthEnd = endOfMonth(lastMonth)

        // === REVENUE: From tea_sales ===
        const { data: currentSales } = await supabase
          .from('tea_sales')
          .select('total_income')
          .gte('date', format(currentMonth, 'yyyy-MM-dd'))
          .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

        const { data: lastSales } = await supabase
          .from('tea_sales')
          .select('total_income')
          .gte('date', format(lastMonth, 'yyyy-MM-dd'))
          .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

        const monthlyRevenue = currentSales?.reduce((sum, s) => sum + (s.total_income || 0), 0) || 0
        const lastMonthRevenue = lastSales?.reduce((sum, s) => sum + (s.total_income || 0), 0) || 0
        const revenueChange = lastMonthRevenue > 0 
          ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0

        // === EXPENSES: From daily_plucking (worker payments) ===
        const { data: currentPayments } = await supabase
          .from('daily_plucking')
          .select('kg_plucked, rate_per_kg, is_advance')
          .gte('date', format(currentMonth, 'yyyy-MM-dd'))
          .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))

        const { data: lastPayments } = await supabase
          .from('daily_plucking')
          .select('kg_plucked, rate_per_kg, is_advance')
          .gte('date', format(lastMonth, 'yyyy-MM-dd'))
          .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'))

        // Calculate expenses: plucking records = kg * rate, advances = kg (which stores amount)
        const monthlyExpenses = currentPayments?.reduce((sum, p) => {
          if (p.is_advance) {
            return sum + Math.abs(p.kg_plucked || 0) // For advances, kg_plucked stores the amount
          }
          return sum + ((p.kg_plucked || 0) * (p.rate_per_kg || 0))
        }, 0) || 0
        const lastMonthExpenses = lastPayments?.reduce((sum, p) => {
          if (p.is_advance) {
            return sum + Math.abs(p.kg_plucked || 0)
          }
          return sum + ((p.kg_plucked || 0) * (p.rate_per_kg || 0))
        }, 0) || 0
        const expensesChange = lastMonthExpenses > 0 
          ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
          : 0

        // === PROFIT: Revenue - Expenses ===
        const monthlyProfit = monthlyRevenue - monthlyExpenses
        const lastMonthProfit = lastMonthRevenue - lastMonthExpenses
        const profitChange = lastMonthProfit !== 0 
          ? ((monthlyProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 
          : 0

        // === TODAY'S HARVEST ===
        const { data: todaysData } = await supabase
          .from('daily_plucking')
          .select('kg_plucked, is_advance')
          .eq('date', todayStr)

        const { data: yesterdaysData } = await supabase
          .from('daily_plucking')
          .select('kg_plucked, is_advance')
          .eq('date', yesterdayStr)

        // Only count plucking records (not advances)
        const todaysHarvest = todaysData
          ?.filter(d => !d.is_advance)
          .reduce((sum, d) => sum + (d.kg_plucked || 0), 0) || 0
        const yesterdaysHarvest = yesterdaysData
          ?.filter(d => !d.is_advance)
          .reduce((sum, d) => sum + (d.kg_plucked || 0), 0) || 0
        const harvestChange = yesterdaysHarvest > 0 
          ? ((todaysHarvest - yesterdaysHarvest) / yesterdaysHarvest) * 100 
          : 0

        setStats({
          monthlyRevenue,
          revenueChange,
          monthlyExpenses,
          expensesChange,
          monthlyProfit,
          profitChange,
          todaysHarvest,
          harvestChange,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-8 bg-muted rounded w-24 mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Revenue Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Revenue</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {formatCurrency(stats.monthlyRevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-xs px-1.5 whitespace-nowrap">
              {stats.revenueChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(0)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            From tea sales
          </div>
          <div className="text-muted-foreground">Compared to last month</div>
        </CardFooter>
      </Card>

      {/* Expenses Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Expenses</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {formatCurrency(stats.monthlyExpenses)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-xs px-1.5 whitespace-nowrap">
              {stats.expensesChange <= 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              {stats.expensesChange >= 0 ? '+' : ''}{stats.expensesChange.toFixed(0)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Worker payments
          </div>
          <div className="text-muted-foreground">Salaries & advances</div>
        </CardFooter>
      </Card>

      {/* Profit Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Profit</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {formatCurrency(stats.monthlyProfit)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-xs px-1.5 whitespace-nowrap">
              {stats.profitChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {stats.profitChange >= 0 ? '+' : ''}{stats.profitChange.toFixed(0)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Revenue - Expenses
          </div>
          <div className="text-muted-foreground">Net profit this month</div>
        </CardFooter>
      </Card>

      {/* Today's Harvest Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Today's Harvest</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {stats.todaysHarvest.toFixed(1)} kg
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-xs px-1.5 whitespace-nowrap">
              {stats.harvestChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {stats.harvestChange >= 0 ? '+' : ''}{stats.harvestChange.toFixed(0)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Tea leaves plucked
          </div>
          <div className="text-muted-foreground">Compared to yesterday</div>
        </CardFooter>
      </Card>
    </div>
  );
}
