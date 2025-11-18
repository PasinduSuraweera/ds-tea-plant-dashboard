"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plantation } from "@/types/database"
import { PlantationForm } from "./plantation-form"
import { PlantationDetails } from "./plantation-details"

export function PlantationsManager() {
  const [plantations, setPlantations] = useState<Plantation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlantation, setSelectedPlantation] = useState<Plantation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchPlantations()
  }, [])

  const fetchPlantations = async () => {
    try {
      const { data, error } = await supabase
        .from('plantations')
        .select('*')
        .order('name')

      if (error) throw error
      setPlantations(data || [])
    } catch (error) {
      console.error('Error fetching plantations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlantation = () => {
    setSelectedPlantation(null)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleEditPlantation = (plantation: Plantation) => {
    setSelectedPlantation(plantation)
    setShowForm(true)
    setShowDetails(false)
  }

  const handleViewPlantation = (plantation: Plantation) => {
    setSelectedPlantation(plantation)
    setShowDetails(true)
    setShowForm(false)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedPlantation(null)
    fetchPlantations() // Refresh data
  }

  const handleDeletePlantation = async (plantation: Plantation) => {
    if (!confirm(`Are you sure you want to delete ${plantation.name}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('plantations')
        .delete()
        .eq('id', plantation.id)
      
      if (error) throw error
      fetchPlantations() // Refresh data
    } catch (error: any) {
      console.error('Error deleting plantation:', error)
      alert(error.message || "Failed to delete plantation")
    }
  }

  const filteredPlantations = plantations.filter(plantation =>
    plantation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plantation.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plantation.tea_variety.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading plantations...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plantations</h2>
          <p className="text-muted-foreground">Manage your tea plantation sites</p>
        </div>
        <Button onClick={handleCreatePlantation}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plantation
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plantations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Plantations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlantations.map((plantation) => (
          <Card key={plantation.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plantation.name}</CardTitle>
                <Badge variant={plantation.status === 'active' ? 'default' : 'secondary'}>
                  {plantation.status}
                </Badge>
              </div>
              <CardDescription>{plantation.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Area:</span>
                  <span>{plantation.area_hectares} hectares</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tea Variety:</span>
                  <span>{plantation.tea_variety}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Altitude:</span>
                  <span>{plantation.altitude_meters}m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Soil Type:</span>
                  <span>{plantation.soil_type}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewPlantation(plantation)}
                >
                  View Details
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditPlantation(plantation)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePlantation(plantation)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlantations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No plantations found</p>
        </div>
      )}

      {/* Forms and Details */}
      {showForm && (
        <PlantationForm
          plantation={selectedPlantation}
          onClose={handleFormClose}
        />
      )}

      {showDetails && selectedPlantation && (
        <PlantationDetails
          plantation={selectedPlantation}
          onClose={() => setShowDetails(false)}
          onEdit={() => handleEditPlantation(selectedPlantation)}
        />
      )}
    </div>
  )
}