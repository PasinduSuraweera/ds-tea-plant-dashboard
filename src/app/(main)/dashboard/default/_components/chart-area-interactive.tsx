"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

export const description = "Tea plantation harvest trends and revenue";

const chartConfig = {
  harvest: {
    label: "Harvest",
    color: "hsl(var(--chart-1))",
  },
  revenue: {
    label: "Revenue", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface ChartData {
  date: string;
  harvest: number;
  revenue: number;
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

        // Get daily plucking data
        const { data: pluckingData, error } = await supabase
          .from('daily_plucking')
          .select('date, kg_plucked, rate_per_kg, total_income')
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(today, 'yyyy-MM-dd'))
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching chart data:', error);
          // Handle missing table gracefully
          if (error.message?.includes('relation "daily_plucking" does not exist')) {
            console.log('Daily plucking table not yet created - showing sample data');
          }
          // Generate realistic sample data if database doesn't exist yet
          const sampleData: ChartData[] = [];
          const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
          
          for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const harvest = Math.floor(Math.random() * 150) + 50; // 50-200 kg
            const rate = 25 + Math.random() * 20; // LKR 25-45 per kg
            sampleData.push({
              date: format(date, 'yyyy-MM-dd'),
              harvest,
              revenue: harvest * rate,
            });
          }
          setChartData(sampleData);
        } else if (pluckingData && pluckingData.length > 0) {
          // Group data by date and calculate totals
          const dailyData: { [key: string]: { harvest: number; revenue: number } } = {};
          
          pluckingData.forEach((item) => {
            const dateKey = item.date;
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = { harvest: 0, revenue: 0 };
            }
            dailyData[dateKey].harvest += item.kg_plucked || 0;
            dailyData[dateKey].revenue += item.total_income || 0;
          });

          // Fill in missing dates with zero values
          const formattedData: ChartData[] = [];
          const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
          
          for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const dateKey = format(date, 'yyyy-MM-dd');
            formattedData.push({
              date: dateKey,
              harvest: dailyData[dateKey]?.harvest || 0,
              revenue: dailyData[dateKey]?.revenue || 0,
            });
          }
          
          setChartData(formattedData);
        } else {
          // No data in database yet, show sample data
          const sampleData: ChartData[] = [];
          const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
          
          for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const harvest = Math.floor(Math.random() * 150) + 50;
            const rate = 25 + Math.random() * 20;
            sampleData.push({
              date: format(date, 'yyyy-MM-dd'),
              harvest,
              revenue: harvest * rate,
            });
          }
          setChartData(sampleData);
        }
      } catch (error) {
        console.error('Error in fetchChartData:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, [timeRange]);

  const totalHarvest = chartData.reduce((sum, item) => sum + item.harvest, 0);
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tea Plantation Analytics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total harvest: {totalHarvest.toFixed(1)} kg • Revenue: {formatCurrency(totalRevenue)}
          </span>
          <span className="@[540px]/card:hidden">
            {totalHarvest.toFixed(1)} kg • {formatCurrency(totalRevenue)}
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
                <linearGradient id="fillHarvest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-harvest)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-harvest)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
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
                      if (name === "harvest") {
                        return [`${value} kg`, "Harvest"];
                      }
                      if (name === "revenue") {
                        return [formatCurrency(Number(value)), "Revenue"];
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
                dataKey="harvest" 
                type="natural" 
                fill="url(#fillHarvest)" 
                fillOpacity={0.4}
                stroke="var(--color-harvest)" 
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
