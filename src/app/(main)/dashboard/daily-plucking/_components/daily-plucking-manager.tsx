"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Plus, Search, Leaf, DollarSign, Edit, Trash2, X, Loader2, CalendarDays, Banknote, MinusCircle, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface ExtraWork {
  description: string
  amount: number
}

interface PluckingRecord {
  id: string
  worker_id: string
  date: string
  kg_plucked: number
  rate_per_kg: number
  daily_salary: number
  extra_work_payment: number
  extra_work_items: ExtraWork[]
  is_advance: boolean
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
  const [extraWorkItems, setExtraWorkItems] = useState<ExtraWork[]>([])
  const [formData, setFormData] = useState({
    worker_id: '',
    kg_plucked: '',
    rate_per_kg: '150',
    is_advance: false,
    advance_amount: '',
    notes: ''
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [selectedDate])

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
          id, worker_id, date, kg_plucked, rate_per_kg, wage_earned, extra_work_payment, notes, is_advance, created_at,
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
        const extraWorkPayment = (record as any).extra_work_payment || 0
        let extraWorkItems: ExtraWork[] = []
        
        // Try to parse extra work items from notes or create from payment
        try {
          const notesData = record.notes ? JSON.parse(record.notes) : null
          if (notesData && notesData.extra_work) {
            extraWorkItems = notesData.extra_work
          } else if (extraWorkPayment > 0) {
            extraWorkItems = [{ description: 'Extra work', amount: extraWorkPayment }]
          }
        } catch {
          if (extraWorkPayment > 0) {
            extraWorkItems = [{ description: 'Extra work', amount: extraWorkPayment }]
          }
        }
        
        return {
          id: record.id,
          worker_id: record.worker_id,
          date: record.date,
          kg_plucked: record.kg_plucked,
          rate_per_kg: record.rate_per_kg,
          daily_salary: record.wage_earned,
          extra_work_payment: extraWorkPayment,
          extra_work_items: extraWorkItems,
          is_advance: (record as any).is_advance || false,
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
    setExtraWorkItems(record.extra_work_items || [])
    setFormData({
      worker_id: record.worker_id,
      kg_plucked: record.is_advance ? '0' : record.kg_plucked.toString(),
      rate_per_kg: record.rate_per_kg.toString(),
      is_advance: record.is_advance,
      advance_amount: record.is_advance ? Math.abs(record.daily_salary).toString() : '',
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

    let kg_plucked: number
    let rate_per_kg: number
    let daily_salary: number
    const extra_work_payment = extraWorkItems.reduce((sum, item) => sum + item.amount, 0)

    if (formData.is_advance) {
      // Advance payment - store as negative
      kg_plucked = 0
      rate_per_kg = 0
      daily_salary = -Math.abs(parseFloat(formData.advance_amount) || 0)
    } else {
      kg_plucked = parseFloat(formData.kg_plucked) || 0
      rate_per_kg = parseFloat(formData.rate_per_kg) || 0
      daily_salary = (kg_plucked * rate_per_kg) + extra_work_payment
    }

    // Store extra work items in notes as JSON
    const notesData: any = {}
    if (extraWorkItems.length > 0) {
      notesData.extra_work = extraWorkItems
    }
    if (formData.notes) {
      notesData.text = formData.notes
    }
    const notesString = Object.keys(notesData).length > 0 ? JSON.stringify(notesData) : null

    const recordData = {
      worker_id: formData.worker_id,
      date: selectedDate,
      kg_plucked,
      rate_per_kg,
      wage_earned: daily_salary,
      total_income: daily_salary,
      extra_work_payment,
      is_advance: formData.is_advance,
      notes: notesString
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
      rate_per_kg: '150',
      is_advance: false,
      advance_amount: '',
      notes: ''
    })
    setExtraWorkItems([])
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
    const totalKg = records.filter(r => !r.is_advance).reduce((sum, r) => sum + r.kg_plucked, 0)
    // Total paid = earnings + advances (advances are already negative, so we sum all)
    const totalPaid = records.reduce((sum, r) => sum + Math.abs(r.daily_salary), 0)

    return { totalKg, totalPaid }
  }, [records])

  // Export functions
  const exportToCSV = () => {
    const headers = ["Date", "Employee ID", "Worker", "Type", "Kg Plucked", "Rate", "Amount", "Notes"]
    const rows = filteredRecords.map(record => [
      selectedDate,
      record.employee_id,
      record.worker_name,
      record.is_advance ? "Advance" : "Plucking",
      record.is_advance ? "" : record.kg_plucked.toFixed(1),
      record.is_advance ? "" : record.rate_per_kg.toFixed(2),
      record.daily_salary.toFixed(2),
      record.notes || ""
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `daily-records-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Exported to CSV")
  }

  const exportToJSON = () => {
    const data = filteredRecords.map(record => ({
      date: selectedDate,
      employee_id: record.employee_id,
      worker_name: record.worker_name,
      type: record.is_advance ? "Advance" : "Plucking",
      kg_plucked: record.is_advance ? null : record.kg_plucked,
      rate_per_kg: record.is_advance ? null : record.rate_per_kg,
      amount: record.daily_salary,
      notes: record.notes
    }))
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `daily-records-${selectedDate}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Exported to JSON")
  }

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Daily Records - ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .advance { color: #dc2626; }
            .plucking { color: #16a34a; }
            .summary { margin-top: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Daily Records - ${selectedDate}</h1>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Worker</th>
                <th>Type</th>
                <th>Kg Plucked</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => `
                <tr class="${record.is_advance ? 'advance' : 'plucking'}">
                  <td>${record.employee_id}</td>
                  <td>${record.worker_name}</td>
                  <td>${record.is_advance ? 'Advance' : 'Plucking'}</td>
                  <td>${record.is_advance ? '-' : record.kg_plucked.toFixed(1) + ' kg'}</td>
                  <td>${record.is_advance ? '-' : formatCurrency(record.rate_per_kg)}</td>
                  <td>${formatCurrency(record.daily_salary)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p><strong>Total Kg:</strong> ${stats.totalKg.toFixed(1)} kg</p>
            <p><strong>Total Paid:</strong> ${formatCurrency(stats.totalPaid)}</p>
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Calculate live salary preview
  const salaryPreview = useMemo(() => {
    if (formData.is_advance) {
      return -(parseFloat(formData.advance_amount) || 0)
    }
    const kg = parseFloat(formData.kg_plucked) || 0
    const rate = parseFloat(formData.rate_per_kg) || 0
    const extraWork = extraWorkItems.reduce((sum, item) => sum + item.amount, 0)
    return (kg * rate) + extraWork
  }, [formData.kg_plucked, formData.rate_per_kg, extraWorkItems, formData.is_advance, formData.advance_amount])

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
      id: "type",
      header: "Type",
      cell: ({ row }) => {
        const hasExtraWork = (row.original.extra_work_items?.length || 0) > 0
        if (row.original.is_advance) {
          return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Advance</Badge>
        }
        if (hasExtraWork) {
          return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Plucking + Work</Badge>
        }
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Plucking</Badge>
      },
    },
    {
      accessorKey: "kg_plucked",
      header: "Kg Plucked",
      cell: ({ row }) => {
        if (row.original.is_advance) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex items-center gap-1.5">
            <Leaf className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{row.getValue<number>("kg_plucked").toFixed(1)} kg</span>
          </div>
        )
      },
    },
    {
      accessorKey: "rate_per_kg",
      header: "Rate",
      cell: ({ row }) => {
        if (row.original.is_advance) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.getValue<number>("rate_per_kg"))}/kg
          </span>
        )
      },
    },
    {
      accessorKey: "daily_salary",
      header: "Amount",
      cell: ({ row }) => {
        const isAdvance = row.original.is_advance
        const amount = row.getValue<number>("daily_salary")
        
        if (isAdvance) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-semibold cursor-help flex items-center gap-1">
                    <MinusCircle className="h-3 w-3" />
                    {formatCurrency(Math.abs(amount))}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Advance payment (will be deducted from monthly salary)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        
        const extraWorkTotal = row.original.extra_work_items?.reduce((sum, item) => sum + item.amount, 0) || 0
        const pluckingTotal = row.original.kg_plucked * row.original.rate_per_kg
        const hasExtraWork = extraWorkTotal > 0

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-semibold cursor-help">
                  {formatCurrency(amount)}
                  {hasExtraWork && <span className="text-xs text-muted-foreground ml-1">*</span>}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p>{row.original.kg_plucked} kg × {formatCurrency(row.original.rate_per_kg)} = {formatCurrency(pluckingTotal)}</p>
                  {hasExtraWork && (
                    <>
                      <p className="text-xs font-semibold mt-2">Extra Work:</p>
                      {row.original.extra_work_items?.map((item, idx) => (
                        <p key={idx} className="text-xs">• {item.description}: {formatCurrency(item.amount)}</p>
                      ))}
                      <p className="text-xs font-semibold mt-1">Total: {formatCurrency(amount)}</p>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
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
          <h2 className="text-lg sm:text-xl font-semibold">Daily Records</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Record</span>
            </Button>
          </div>
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
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid gap-3 grid-cols-2 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Kg</span>
            <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold mt-1">{stats.totalKg.toFixed(1)} kg</div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total to be paid</span>
            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-bold mt-1">{formatCurrency(stats.totalPaid)}</div>
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
                {/* Record Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!formData.is_advance ? "default" : "outline"}
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => setFormData({ ...formData, is_advance: false })}
                  >
                    <Leaf className="h-3.5 w-3.5 mr-1.5" />
                    Plucking
                  </Button>
                  <Button
                    type="button"
                    variant={formData.is_advance ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => setFormData({ ...formData, is_advance: true })}
                  >
                    <Banknote className="h-3.5 w-3.5 mr-1.5" />
                    Advance
                  </Button>
                </div>

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

                {formData.is_advance ? (
                  /* Advance Payment Fields */
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="advance_amount" className="text-xs">Advance Amount (රු) *</Label>
                      <Input
                        id="advance_amount"
                        type="number"
                        step="1"
                        min="0"
                        value={formData.advance_amount}
                        onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                        placeholder="e.g., 5000"
                        required
                        className="h-8"
                      />
                    </div>

                    {/* Advance Preview */}
                    <div className="rounded-md bg-muted/50 border p-3">
                      <div className="flex justify-between font-medium">
                        <span className="text-sm text-muted-foreground">Advance Payment</span>
                        <span>{formatCurrency(Math.abs(salaryPreview))}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Will be deducted from monthly salary
                      </p>
                    </div>
                  </>
                ) : (
                  /* Plucking Fields */
                  <>
                    <div className="grid grid-cols-2 gap-3">
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

                      <div className="space-y-1.5">
                        <Label htmlFor="rate_per_kg" className="text-xs">Rate/kg (රු) *</Label>
                        <Input
                          id="rate_per_kg"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.rate_per_kg}
                          onChange={(e) => setFormData({ ...formData, rate_per_kg: e.target.value })}
                          placeholder="e.g., 150"
                          required
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Extra Work Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Extra Work</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setExtraWorkItems([...extraWorkItems, { description: '', amount: 0 }])}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Work
                        </Button>
                      </div>
                      
                      {extraWorkItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                            <Input
                              type="text"
                              placeholder="e.g., Weeding"
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...extraWorkItems]
                                newItems[index].description = e.target.value
                                setExtraWorkItems(newItems)
                              }}
                              className="h-8"
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="රු"
                              value={item.amount || ''}
                              onChange={(e) => {
                                const newItems = [...extraWorkItems]
                                newItems[index].amount = parseFloat(e.target.value) || 0
                                setExtraWorkItems(newItems)
                              }}
                              className="h-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => {
                              setExtraWorkItems(extraWorkItems.filter((_, i) => i !== index))
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Salary Preview */}
                    <div className="rounded-md bg-muted/50 border p-3">
                      <div className="flex justify-between font-medium">
                        <span className="text-sm text-muted-foreground">Daily Salary</span>
                        <span>{formatCurrency(salaryPreview)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.kg_plucked || '0'} kg × {formatCurrency(parseFloat(formData.rate_per_kg) || 0)}/kg
                        {extraWorkItems.length > 0 && (
                          <> + {formatCurrency(extraWorkItems.reduce((sum, item) => sum + item.amount, 0))} extra</>
                        )}
                      </p>
                      {extraWorkItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t space-y-0.5">
                          {extraWorkItems.map((item, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{item.description || 'Work'}</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

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