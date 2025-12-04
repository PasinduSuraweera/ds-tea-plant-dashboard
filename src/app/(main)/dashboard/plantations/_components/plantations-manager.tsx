"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, ImageIcon, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Title and Add Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold">Plantations</h2>
          <Button onClick={handleCreatePlantation} size="sm" className="sm:size-default">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Plantation</span>
          </Button>
        </div>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plantations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      

      {/* Plantations Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPlantations.map((plantation) => (
          <Card key={plantation.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden group">
            {/* Plantation Image */}
            <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden">
              {plantation.image_url ? (
                <Image
                  src={plantation.image_url}
                  alt={plantation.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  quality={85}
                  priority={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50">
                  <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <CardHeader className="p-3 sm:pt-4 sm:px-6 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg line-clamp-1">{plantation.name}</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-1">{plantation.location}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-1 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Area:</span>
                  <span>{plantation.area_hectares} ha</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Variety:</span>
                  <span className="truncate ml-2">{plantation.tea_variety}</span>
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleViewPlantation(plantation)}
                >
                  <span className="hidden xs:inline">View </span>Details
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleEditPlantation(plantation)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                  onClick={() => handleDeletePlantation(plantation)}
                >
                  <X className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">Delete</span>
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