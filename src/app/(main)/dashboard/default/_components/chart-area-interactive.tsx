"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart, YAxis, Line, LineChart, ComposedChart } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const SL_TIMEZONE = 'Asia/Colombo'

export const description = "Revenue vs Expenses financial overview";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses", 
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

interface ChartData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("30d");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        const today = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case "7d":
            startDate = subDays(today, 7);
            break;
          case "30d":
            startDate = subDays(today, 30);
            break;
          case "90d":
            startDate = subDays(today, 90);
            break;
          default:
            startDate = subDays(today, 30);
        }

        const startDateStr = format(startDate, 'yyyy-MM-dd')
        const todayStr = format(today, 'yyyy-MM-dd')

        // Get tea sales data (revenue)
        const { data: salesData, error: salesError } = await supabase
          .from('tea_sales')
          .select('date, total_income')
          .gte('date', startDateStr)
          .lte('date', todayStr)
          .order('date', { ascending: true });

        // Get daily plucking data (expenses - worker payments calculated from kg * rate)
        const { data: pluckingData, error: pluckingError } = await supabase
          .from('daily_plucking')
          .select('date, kg_plucked, rate_per_kg')
          .gte('date', startDateStr)
          .lte('date', todayStr)
          .order('date', { ascending: true });

        // Group data by date
        const dailyData: { [key: string]: { revenue: number; expenses: number } } = {};
        
        // Process sales (revenue)
        if (salesData) {
          salesData.forEach((item) => {
            if (!dailyData[item.date]) {
              dailyData[item.date] = { revenue: 0, expenses: 0 };
            }
            dailyData[item.date].revenue += item.total_income || 0;
          });
        }

        // Process plucking (expenses - calculate from kg * rate)
        if (pluckingData) {
          pluckingData.forEach((item) => {
            if (!dailyData[item.date]) {
              dailyData[item.date] = { revenue: 0, expenses: 0 };
            }
            const payment = (item.kg_plucked || 0) * (item.rate_per_kg || 0);
            dailyData[item.date].expenses += payment;
          });
        }

        // Fill in all dates
        const formattedData: ChartData[] = [];
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        
        for (let i = days - 1; i >= 0; i--) {
          const date = subDays(today, i);
          const dateKey = format(date, 'yyyy-MM-dd');
          const revenue = dailyData[dateKey]?.revenue || 0;
          const expenses = dailyData[dateKey]?.expenses || 0;
          formattedData.push({
            date: dateKey,
            revenue,
            expenses,
            profit: revenue - expenses,
          });
        }
        
        setChartData(formattedData);
      } catch (error) {
        console.error('Error in fetchChartData:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, [timeRange]);

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Revenue: {formatCurrency(totalRevenue)} • Expenses: {formatCurrency(totalExpenses)} • Profit: {formatCurrency(totalProfit)}
          </span>
          <span className="@[540px]/card:hidden">
            Profit: {formatCurrency(totalProfit)}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="aspect-auto h-[250px] w-full flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    formatter={(value, name) => {
                      if (name === "revenue") {
                        return [formatCurrency(Number(value)), "Revenue"];
                      }
                      if (name === "expenses") {
                        return [formatCurrency(Number(value)), "Expenses"];
                      }
                      if (name === "profit") {
                        return [formatCurrency(Number(value)), "Profit"];
                      }
                      return [value, name];
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area 
                dataKey="revenue" 
                type="natural" 
                fill="url(#fillRevenue)" 
                fillOpacity={0.4}
                stroke="var(--color-revenue)" 
                stackId="a" 
              />
              <Area 
                dataKey="expenses" 
                type="natural" 
                fill="url(#fillExpenses)" 
                fillOpacity={0.4}
                stroke="var(--color-expenses)" 
                stackId="b"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
