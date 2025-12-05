"use client"

import { useState, useEffect } from "react"
import { Plus, Search, ImageIcon, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Plantation } from "@/types/database"
import { PlantationForm } from "./plantation-form"

export function PlantationsManager() {
  const [plantations, setPlantations] = useState<Plantation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlantation, setSelectedPlantation] = useState<Plantation | null>(null)
  const [showForm, setShowForm] = useState(false)

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
  }

  const handleEditPlantation = (plantation: Plantation) => {
    setSelectedPlantation(plantation)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedPlantation(null)
    fetchPlantations() // Refresh data
  }

  const handleDeletePlantation = async (plantation: Plantation) => {
    try {
      // Check if there are workers assigned to this plantation
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('id')
        .eq('plantation_id', plantation.id)
        .limit(1)

      if (workersError) throw workersError

      if (workers && workers.length > 0) {
        alert(`Cannot delete "${plantation.name}" because it has workers assigned to it. Please reassign or remove the workers first.`)
        return
      }

      if (!confirm(`Are you sure you want to delete ${plantation.name}?`)) {
        return
      }

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
    plantation.location.toLowerCase().includes(searchTerm.toLowerCase())
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
          <Button onClick={handleCreatePlantation} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Plantation</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plantations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Plantations Grid */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        {filteredPlantations.map((plantation) => (
          <Card key={plantation.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden p-0">
            {/* Plantation Image - extends to all edges */}
            <div className="relative aspect-[16/9] w-full bg-muted">
              {plantation.image_url ? (
                <Image
                  src={plantation.image_url}
                  alt={plantation.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                  quality={80}
                  priority={false}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/5 to-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            {/* Card Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-base line-clamp-1">{plantation.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{plantation.location}</p>
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium">{plantation.area_hectares} ha</span>
                </div>
                {plantation.established_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Established</span>
                    <span className="font-medium">{new Date(plantation.established_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-8 text-sm"
                  onClick={() => handleEditPlantation(plantation)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => handleDeletePlantation(plantation)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPlantations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No plantations found</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <PlantationForm
          plantation={selectedPlantation}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}