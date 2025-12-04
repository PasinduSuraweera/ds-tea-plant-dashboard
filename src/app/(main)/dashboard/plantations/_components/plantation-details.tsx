"use client"

import { useState, useEffect } from "react"
import { X, Edit, MapPin, Calendar, Leaf, ImageIcon } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Plantation } from "@/types/database"

interface PlantationDetailsProps {
  plantation: Plantation
  onClose: () => void
  onEdit: () => void
}

export function PlantationDetails({ plantation, onClose, onEdit }: PlantationDetailsProps) {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    monthlyHarvest: 0,
    avgDailyOutput: 0,
  })

  useEffect(() => {
    fetchPlantationData()
  }, [plantation.id])

  const fetchPlantationData = async () => {
    try {
      // Fetch workers count
      const { data: workersData } = await supabase
        .from('workers')
        .select('id')
        .eq('plantation_id', plantation.id)
        .eq('status', 'active')

      // Calculate stats
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const { data: monthlyHarvestData } = await supabase
        .from('harvest_records')
        .select('quantity_kg')
        .eq('plantation_id', plantation.id)
        .gte('harvest_date', firstDayOfMonth.toISOString().split('T')[0])

      const totalMonthlyHarvest = monthlyHarvestData?.reduce((sum, record) => sum + record.quantity_kg, 0) || 0
      const currentDay = currentMonth.getDate()

      setStats({
        totalWorkers: workersData?.length || 0,
        monthlyHarvest: totalMonthlyHarvest,
        avgDailyOutput: totalMonthlyHarvest / currentDay,
      })
    } catch (error) {
      console.error('Error fetching plantation data:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-xl">
        <CardHeader className="p-4 sm:p-6 border-b shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-2xl line-clamp-1">{plantation.name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1 sm:mt-2 text-xs sm:text-sm">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{plantation.location}</span>
              </CardDescription>
            </div>
            <div className="flex gap-1.5 sm:gap-2 shrink-0">
              <Button variant="default" size="sm" onClick={onEdit} className="h-8 sm:h-9">
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-9 sm:w-9">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Plantation Image */}
          <div className="relative aspect-[16/9] w-full rounded-lg sm:rounded-xl overflow-hidden bg-muted shadow-sm">
            {plantation.image_url ? (
              <Image
                src={plantation.image_url}
                alt={plantation.name}
                fill
                sizes="(max-width: 640px) 100vw, 672px"
                className="object-cover"
                quality={90}
                priority
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 mb-2 opacity-30" />
                <span className="text-xs sm:text-sm">No image uploaded</span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold">{stats.totalWorkers}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Workers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold">{stats.monthlyHarvest.toFixed(0)}<span className="text-sm sm:text-base font-normal"> kg</span></div>
                <p className="text-xs sm:text-sm text-muted-foreground">Monthly Harvest</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold">{stats.avgDailyOutput.toFixed(1)}<span className="text-sm sm:text-base font-normal"> kg</span></div>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Daily Output</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold">{plantation.area_hectares}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Hectares</p>
              </CardContent>
            </Card>
          </div>

          {/* Plantation Information */}
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">Plantation Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Tea Variety</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{plantation.tea_variety}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Established</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {plantation.established_date ? new Date(plantation.established_date).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}