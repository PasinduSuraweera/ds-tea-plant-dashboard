"use client"

import { useEffect, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTableInstance } from "@/hooks/use-data-table-instance"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils"

interface RecentHarvest {
  id: string
  plantation_name: string
  worker_name: string
  date: string
  kg_plucked: number
  total_income: number
  status: 'completed' | 'in_progress'
}

const columns: ColumnDef<RecentHarvest>[] = [
  {
    accessorKey: "plantation_name",
    header: "Plantation",
  },
  {
    accessorKey: "worker_name",
    header: "Worker",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("date") as string
      return format(new Date(date), 'MMM dd, yyyy')
    },
  },
  {
    accessorKey: "kg_plucked",
    header: "Quantity (kg)",
    cell: ({ row }) => {
      const quantity = row.getValue("kg_plucked") as number
      return <span className="font-medium">{quantity.toFixed(1)}</span>
    },
  },
  {
    accessorKey: "total_income",
    header: "Income",
    cell: ({ row }) => {
      const income = row.getValue("total_income") as number
      return <span className="font-medium">{formatCurrency(income)}</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={status === "completed" ? "default" : "secondary"}>
          {status.replace('_', ' ')}
        </Badge>
      )
    },
  },
]

export function RecentHarvestTable() {
  const [harvestData, setHarvestData] = useState<RecentHarvest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentHarvests() {
      try {
        const { data, error } = await supabase
          .from('daily_plucking')
          .select(`
            id,
            date,
            kg_plucked,
            total_income,
            workers (
              first_name,
              last_name
            ),
            plantations (
              name
            )
          `)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching harvest data:', error)
          // If table doesn't exist, just show empty state
          if (error.message?.includes('relation "daily_plucking" does not exist')) {
            setHarvestData([])
          }
          return
        }

        const processedData: RecentHarvest[] = data?.map(record => ({
          id: record.id,
          plantation_name: (record.plantations as any)?.name || 'Unknown Plantation',
          worker_name: `${(record.workers as any)?.first_name || ''} ${(record.workers as any)?.last_name || ''}`.trim() || 'Unknown Worker',
          date: record.date,
          kg_plucked: record.kg_plucked || 0,
          total_income: record.total_income || 0,
          status: 'completed' as const, // All records are completed by default
        })) || []

        setHarvestData(processedData)
      } catch (error) {
        console.error('Error fetching recent harvests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentHarvests()
  }, [])

  const table = useDataTableInstance({
    data: harvestData,
    columns,
    getRowId: (row) => row.id,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Harvest Records</CardTitle>
        <CardDescription>Latest harvest activities from daily plucking records</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : harvestData.length > 0 ? (
          <DataTable table={table} columns={columns} />
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No harvest records found
          </div>
        )}
      </CardContent>
    </Card>
  )
}