"use client"

import { useState, useEffect } from "react"
import { Plus, TrendingUp, Factory, Package, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useDataTableInstance } from "@/hooks/use-data-table-instance"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"

interface TeaSale {
  id: string
  date: string
  factory_name: string
  kg_delivered: number
  rate_per_kg: number
  total_income: number
  notes?: string
}

interface MonthlySummary {
  month: string
  total_kg: number
  total_income: number
}

const monthlySummaryConfig = {
  total_kg: {
    label: "Total KG",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const columns: ColumnDef<TeaSale>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("date") as string
      return format(new Date(date), 'MMM dd, yyyy')
    },
  },
  {
    accessorKey: "factory_name",
    header: "Factory",
  },
  {
    accessorKey: "kg_delivered",
    header: "KG Delivered",
    cell: ({ row }) => {
      const kg = row.getValue("kg_delivered") as number
      return <span className="font-medium">{kg.toFixed(1)} kg</span>
    },
  },
  {
    accessorKey: "rate_per_kg",
    header: "Rate/KG",
    cell: ({ row }) => {
      const rate = row.getValue("rate_per_kg") as number
      return <span>{formatCurrency(rate)}</span>
    },
  },
  {
    accessorKey: "total_income",
    header: "Total Income",
    cell: ({ row }) => {
      const income = row.getValue("total_income") as number
      return <span className="font-medium">{formatCurrency(income)}</span>
    },
  },
]

export function TeaSalesManager() {
  const [teaSales, setTeaSales] = useState<TeaSale[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    factory_name: '',
    kg_delivered: '',
    rate_per_kg: '',
    notes: ''
  })

  useEffect(() => {
    fetchTeaSalesData()
  }, [])

  async function fetchTeaSalesData() {
    try {
      // For now, use sample data since table doesn't exist
      const sampleData: TeaSale[] = [
        {
          id: '1',
          date: '2025-11-18',
          factory_name: 'Ceylon Tea Factory',
          kg_delivered: 150.5,
          rate_per_kg: 1200,
          total_income: 180600,
          notes: 'High quality green tea'
        },
        {
          id: '2',
          date: '2025-11-17',
          factory_name: 'Mountain View Tea Mills',
          kg_delivered: 200.0,
          rate_per_kg: 1150,
          total_income: 230000,
        }
      ]

      setTeaSales(sampleData)

      const monthlySummaryData: MonthlySummary[] = [
        { month: 'Oct 2025', total_kg: 1250, total_income: 1425000 },
        { month: 'Nov 2025', total_kg: 350.5, total_income: 410600 },
      ]

      setMonthlySummary(monthlySummaryData)
    } catch (error) {
      console.error('Error processing tea sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('Tea sale submitted:', formData)
    setIsAddDialogOpen(false)
  }

  const table = useDataTableInstance({
    data: teaSales,
    columns,
    getRowId: (row) => row.id,
  })

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tea Sales Management</h1>
          <p className="text-muted-foreground">Track tea deliveries and income from factory sales</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Tea Sale</DialogTitle>
              <DialogDescription>
                Enter details of tea delivered to factory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factory_name">Factory Name *</Label>
                  <Input
                    id="factory_name"
                    value={formData.factory_name}
                    onChange={(e) => setFormData({...formData, factory_name: e.target.value})}
                    placeholder="Enter factory name"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="kg_delivered">KG Delivered *</Label>
                  <Input
                    id="kg_delivered"
                    type="number"
                    step="0.1"
                    value={formData.kg_delivered}
                    onChange={(e) => setFormData({...formData, kg_delivered: e.target.value})}
                    placeholder="0.0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_per_kg">Rate per KG (LKR) *</Label>
                  <Input
                    id="rate_per_kg"
                    type="number"
                    step="0.01"
                    value={formData.rate_per_kg}
                    onChange={(e) => setFormData({...formData, rate_per_kg: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Record Sale</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month KG</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">350.5 kg</div>
            <p className="text-xs text-muted-foreground">
              Tea delivered to factories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(410600)}</div>
            <p className="text-xs text-muted-foreground">
              From tea sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Factories</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Buying our tea
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rate/KG</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(1175)}</div>
            <p className="text-xs text-muted-foreground">
              This month average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Performance</CardTitle>
          <CardDescription>Tea sales over the last months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthlySummaryConfig}>
            <AreaChart
              accessibilityLayer
              data={monthlySummary}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey="total_kg"
                type="natural"
                fill="var(--color-total_kg)"
                fillOpacity={0.4}
                stroke="var(--color-total_kg)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tea Sales</CardTitle>
          <CardDescription>Latest tea deliveries to factories</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable table={table} columns={columns} />
        </CardContent>
      </Card>
    </div>
  )
}