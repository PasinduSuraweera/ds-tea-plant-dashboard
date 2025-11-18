"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { WorkerWithPlantation } from "@/types/database"
import { WorkerForm } from "./worker-form"
import { WorkerDetails } from "./worker-details"
import { formatCurrency } from "@/lib/utils"

export function WorkersManager() {
  const [workers, setWorkers] = useState<WorkerWithPlantation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithPlantation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select(`
          *,
          plantation:plantations(id, name, location)
        `)
        .order('last_name')

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorker = () => {
    setSelectedWorker(null)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleEditWorker = (worker: WorkerWithPlantation) => {
    setSelectedWorker(worker)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleViewWorker = (worker: WorkerWithPlantation) => {
    setSelectedWorker(worker)
    setShowDetails(true)
    setShowForm(false)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedWorker(null)
    fetchWorkers() // Refresh data
  }

  const handleDeleteWorker = async (worker: WorkerWithPlantation) => {
    if (!confirm(`Are you sure you want to delete ${worker.first_name} ${worker.last_name}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', worker.id)
      
      if (error) throw error
      fetchWorkers() // Refresh data
    } catch (error: any) {
      console.error('Error deleting worker:', error)
      alert(error.message || "Failed to delete worker")
    }
  }

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = 
      worker.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.employee_id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || worker.role === roleFilter
    const matchesStatus = statusFilter === "all" || worker.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'manager': return 'default'
      case 'supervisor': return 'secondary'
      case 'quality_controller': return 'outline'
      default: return 'destructive'
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading workers...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workers</h2>
          <p className="text-muted-foreground">Manage your plantation workforce</p>
        </div>
        <Button onClick={handleCreateWorker}>
          <Plus className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
            <SelectItem value="quality_controller">Quality Controller</SelectItem>
            <SelectItem value="picker">Picker</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkers.map((worker) => (
          <Card key={worker.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {worker.first_name} {worker.last_name}
                </CardTitle>
                <div className="flex gap-1">
                  <Badge variant={getRoleBadgeVariant(worker.role)}>
                    {worker.role.replace('_', ' ')}
                  </Badge>
                  <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                    {worker.status}
                  </Badge>
                </div>
              </div>
              <CardDescription>{worker.employee_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{worker.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plantation:</span>
                  <span className="truncate">{worker.plantation?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Salary:</span>
                  <span className="font-medium">
                    {worker.salary ? formatCurrency(worker.salary) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hire Date:</span>
                  <span>
                    {worker.hire_date ? new Date(worker.hire_date).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewWorker(worker)}
                >
                  View Details
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditWorker(worker)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteWorker(worker)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workers found matching your criteria</p>
        </div>
      )}

      {/* Forms and Details */}
      {showForm && (
        <WorkerForm
          worker={selectedWorker}
          onClose={handleFormClose}
        />
      )}

      {showDetails && selectedWorker && (
        <WorkerDetails
          worker={selectedWorker}
          onClose={() => setShowDetails(false)}
          onEdit={() => handleEditWorker(selectedWorker)}
        />
      )}
    </div>
  )
}