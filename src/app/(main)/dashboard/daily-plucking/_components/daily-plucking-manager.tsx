"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, Search, Leaf, Users, DollarSign, Edit, Trash2, X, Loader2, TrendingUp, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ColumnDef } from "@tanstack/react-table"
import { useDataTableInstance } from "@/hooks/use-data-table-instance"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

const SL_TIMEZONE = 'Asia/Colombo'

function getSLDate() {
  return formatInTimeZone(new Date(), SL_TIMEZONE, 'yyyy-MM-dd')
}

interface Worker {
  id: string
  employee_id: string
  first_name: string
  last_name: string | null
}

interface PluckingRecord {
  id: string
  worker_id: string
  date: string
  kg_plucked: number
  rate_per_kg: number
  daily_salary: number
  notes: string | null
  created_at: string
  worker_name: string
  employee_id: string
}

export function DailyPluckingManager() {
  const [records, setRecords] = useState<PluckingRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(getSLDate())
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PluckingRecord | null>(null)
  const [ratePerKg, setRatePerKg] = useState<number>(150) // Default rate per kg
  const [formData, setFormData] = useState({
    worker_id: '',
    kg_plucked: '',
    notes: ''
  })

  useEffect(() => {
    fetchWorkers()
    fetchRatePerKg()
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [selectedDate])

  async function fetchRatePerKg() {
    // You can set a default rate or fetch from settings
    // For now using a default rate of 150 LKR per kg
    setRatePerKg(150)
  }

  async function fetchWorkers() {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, employee_id, first_name, last_name')
        .order('first_name')

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
      toast.error("Failed to load workers")
    }
  }

  async function fetchRecords() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('daily_plucking')
        .select(`
          id, worker_id, date, kg_plucked, rate_per_kg, wage_earned, notes, created_at,
          workers (employee_id, first_name, last_name)
        `)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.message?.includes('relation "daily_plucking" does not exist')) {
          setRecords([])
          return
        }
        throw error
      }

      const processedRecords: PluckingRecord[] = (data || []).map(record => {
        const worker = record.workers as any
        return {
          id: record.id,
          worker_id: record.worker_id,
          date: record.date,
          kg_plucked: record.kg_plucked,
          rate_per_kg: record.rate_per_kg,
          daily_salary: record.wage_earned,
          notes: record.notes,
          created_at: record.created_at,
          worker_name: worker ? `${worker.first_name}${worker.last_name ? ' ' + worker.last_name : ''}` : 'Unknown',
          employee_id: worker?.employee_id || '-'
        }
      })

      setRecords(processedRecords)
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error("Failed to load records")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = useCallback((record: PluckingRecord) => {
    setEditingRecord(record)
    setFormData({
      worker_id: record.worker_id,
      kg_plucked: record.kg_plucked.toString(),
      notes: record.notes || ''
    })
    setShowForm(true)
  }, [])

  const handleDelete = useCallback(async (record: PluckingRecord) => {
    if (!confirm(`Delete record for ${record.worker_name}?`)) return

    try {
      const { error } = await supabase
        .from('daily_plucking')
        .delete()
        .eq('id', record.id)

      if (error) throw error

      setRecords(prev => prev.filter(r => r.id !== record.id))
      toast.success("Record deleted successfully")
    } catch (error: any) {
      console.error('Error deleting record:', error)
      toast.error(error.message || "Failed to delete record")
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)

    const kg_plucked = parseFloat(formData.kg_plucked)
    const daily_salary = kg_plucked * ratePerKg

    const recordData = {
      worker_id: formData.worker_id,
      date: selectedDate,
      kg_plucked,
      rate_per_kg: ratePerKg,
      wage_earned: daily_salary,
      total_income: daily_salary,
      notes: formData.notes || null
    }

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('daily_plucking')
          .update(recordData)
          .eq('id', editingRecord.id)

        if (error) throw error
        toast.success("Record updated successfully")
      } else {
        const { error } = await supabase
          .from('daily_plucking')
          .insert(recordData)

        if (error) throw error
        toast.success("Record added successfully")
      }

      setShowForm(false)
      setEditingRecord(null)
      resetForm()
      fetchRecords()
    } catch (error: any) {
      console.error('Error saving record:', error)
      toast.error(error.message || "Failed to save record")
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      worker_id: '',
      kg_plucked: '',
      notes: ''
    })
    setEditingRecord(null)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    resetForm()
  }

  const filteredRecords = useMemo(() =>
    records.filter(record =>
      record.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [records, searchTerm]
  )

  const stats = useMemo(() => {
    const totalKg = records.reduce((sum, r) => sum + r.kg_plucked, 0)
    const totalSalary = records.reduce((sum, r) => sum + r.daily_salary, 0)
    const totalWorkers = new Set(records.map(r => r.worker_id)).size
    const avgPerWorker = totalWorkers > 0 ? totalKg / totalWorkers : 0

    return { totalKg, totalSalary, totalWorkers, avgPerWorker }
  }, [records])

  // Calculate live salary preview
  const salaryPreview = useMemo(() => {
    const kg = parseFloat(formData.kg_plucked) || 0
    return kg * ratePerKg
  }, [formData.kg_plucked, ratePerKg])

  const columns: ColumnDef<PluckingRecord>[] = useMemo(() => [
    {
      accessorKey: "employee_id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.getValue("employee_id")}</span>
      ),
    },
    {
      id: "worker",
      header: "Worker",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.worker_name}</span>
      ),
    },
    {
      accessorKey: "kg_plucked",
      header: "Kg Plucked",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Leaf className="h-3 w-3 text-green-600" />
          <span className="font-medium">{row.getValue<number>("kg_plucked").toFixed(1)} kg</span>
        </div>
      ),
    },
    {
      accessorKey: "rate_per_kg",
      header: "Rate",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(row.getValue<number>("rate_per_kg"))}/kg
        </span>
      ),
    },
    {
      accessorKey: "daily_salary",
      header: "Daily Salary",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold text-green-600 cursor-help">
                {formatCurrency(row.getValue<number>("daily_salary"))}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.original.kg_plucked} kg × {formatCurrency(row.original.rate_per_kg)} = {formatCurrency(row.original.daily_salary)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex gap-1 justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(record)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit record</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(record)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete record</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete])

  const table = useDataTableInstance({
    data: filteredRecords,
    columns,
    getRowId: (row) => row.id,
  })

  if (loading && records.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading records...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold">Daily Plucking</h2>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Record</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-9"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Harvest</span>
            <Leaf className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div className="text-lg font-bold mt-1">{stats.totalKg.toFixed(1)} kg</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Salary</span>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold mt-1">{formatCurrency(stats.totalSalary)}</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Workers</span>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold mt-1">{stats.totalWorkers}</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Avg / Worker</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold mt-1">{stats.avgPerWorker.toFixed(1)} kg</div>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Records for {format(new Date(selectedDate + 'T00:00:00'), 'MMMM dd, yyyy')}
          </CardTitle>
          <CardDescription className="text-xs">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
            {searchTerm && ` matching "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[400px] overflow-auto rounded-md border">
            <DataTable table={table} columns={columns} />
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {filteredRecords.length === 0 && !loading && (
        <div className="text-center py-12">
          <Leaf className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? `No records matching "${searchTerm}"` : 'No records for this date'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? 'Try a different search term' : 'Add plucking records for workers'}
          </p>
        </div>
      )}

      {/* Add/Edit Record Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editingRecord ? 'Edit Record' : 'Add Record'}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCloseForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">
                Date: {format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="worker_id" className="text-xs">Worker *</Label>
                  <Select
                    value={formData.worker_id}
                    onValueChange={(value) => setFormData({ ...formData, worker_id: value })}
                    required
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px]">
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.first_name}{worker.last_name ? ` ${worker.last_name}` : ''} ({worker.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="kg_plucked" className="text-xs">Kg Plucked *</Label>
                  <Input
                    id="kg_plucked"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.kg_plucked}
                    onChange={(e) => setFormData({ ...formData, kg_plucked: e.target.value })}
                    placeholder="e.g., 15.5"
                    required
                    className="h-8"
                  />
                </div>

                {/* Salary Preview */}
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rate per kg</span>
                    <span>{formatCurrency(ratePerKg)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-sm">Daily Salary</span>
                    <span className="text-green-600">{formatCurrency(salaryPreview)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                    className="h-8"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCloseForm}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={formLoading}>
                    {formLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    {editingRecord ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}