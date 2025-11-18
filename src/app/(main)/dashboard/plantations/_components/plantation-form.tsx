"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Plantation } from "@/types/database"
import { toast } from "sonner"

const plantationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  area_hectares: z.number().positive("Area must be positive"),
  tea_variety: z.string().min(2, "Tea variety is required"),
  established_date: z.string().optional(),
  altitude_meters: z.number().optional(),
  soil_type: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
})

type PlantationFormData = z.infer<typeof plantationSchema>

interface PlantationFormProps {
  plantation?: Plantation | null
  onClose: () => void
}

export function PlantationForm({ plantation, onClose }: PlantationFormProps) {
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PlantationFormData>({
    resolver: zodResolver(plantationSchema),
    defaultValues: {
      name: plantation?.name || "",
      location: plantation?.location || "",
      area_hectares: plantation?.area_hectares || 0,
      tea_variety: plantation?.tea_variety || "",
      established_date: plantation?.established_date || "",
      altitude_meters: plantation?.altitude_meters || 0,
      soil_type: plantation?.soil_type || "",
      status: plantation?.status || "active",
    },
  })

  const onSubmit = async (data: PlantationFormData) => {
    setLoading(true)
    
    try {
      if (plantation) {
        // Update existing plantation
        const { error } = await supabase
          .from('plantations')
          .update(data)
          .eq('id', plantation.id)
        
        if (error) throw error
        toast.success("Plantation updated successfully")
      } else {
        // Create new plantation
        const { error } = await supabase
          .from('plantations')
          .insert([data])
        
        if (error) throw error
        toast.success("Plantation created successfully")
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving plantation:', error)
      toast.error("Failed to save plantation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{plantation ? 'Edit Plantation' : 'Create New Plantation'}</CardTitle>
              <CardDescription>
                {plantation ? 'Update plantation details' : 'Add a new tea plantation to your management system'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Plantation Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Highland Tea Estate"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Nuwara Eliya, Sri Lanka"
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_hectares">Area (Hectares) *</Label>
                <Input
                  id="area_hectares"
                  type="number"
                  step="0.1"
                  {...register("area_hectares", { valueAsNumber: true })}
                  placeholder="120.5"
                />
                {errors.area_hectares && (
                  <p className="text-sm text-destructive">{errors.area_hectares.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tea_variety">Tea Variety *</Label>
                <Input
                  id="tea_variety"
                  {...register("tea_variety")}
                  placeholder="Ceylon Black Tea"
                />
                {errors.tea_variety && (
                  <p className="text-sm text-destructive">{errors.tea_variety.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="established_date">Established Date</Label>
                <Input
                  id="established_date"
                  type="date"
                  {...register("established_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altitude_meters">Altitude (meters)</Label>
                <Input
                  id="altitude_meters"
                  type="number"
                  {...register("altitude_meters", { valueAsNumber: true })}
                  placeholder="1850"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="soil_type">Soil Type</Label>
                <Input
                  id="soil_type"
                  {...register("soil_type")}
                  placeholder="Loamy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) => setValue("status", value as any)}
                  defaultValue={watch("status")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {plantation ? 'Update' : 'Create'} Plantation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}