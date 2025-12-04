"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Save, Loader2, Upload, ImageIcon } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  image_url: z.string().optional(),
})

type PlantationFormData = z.infer<typeof plantationSchema>

interface PlantationFormProps {
  plantation?: Plantation | null
  onClose: () => void
}

export function PlantationForm({ plantation, onClose }: PlantationFormProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(plantation?.image_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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
      image_url: plantation?.image_url || "",
    },
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    setUploading(true)

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `plantations/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('plantation-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plantation-images')
        .getPublicUrl(filePath)

      setImagePreview(publicUrl)
      setValue('image_url', publicUrl)
      toast.success("Image uploaded successfully")
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setValue('image_url', '')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-xl">
        <CardHeader className="p-4 sm:p-6 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">{plantation ? 'Edit Plantation' : 'Create New Plantation'}</CardTitle>
              <CardDescription className="text-xs sm:text-sm hidden sm:block">
                {plantation ? 'Update plantation details' : 'Add a new tea plantation to your management system'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label className="text-sm">Plantation Image</Label>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                <div className="relative aspect-[16/10] w-full sm:w-56 bg-muted rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/25 shadow-sm">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Plantation preview"
                        fill
                        sizes="(max-width: 640px) 100vw, 224px"
                        className="object-cover"
                        quality={85}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 shadow-md"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8 sm:py-0">
                      <ImageIcon className="h-10 w-10 sm:h-8 sm:w-8 mb-2 sm:mb-1" />
                      <span className="text-sm sm:text-xs">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    Max: 5MB (JPG, PNG, WebP)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-sm">Plantation Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Highland Tea Estate"
                  className="h-10"
                />
                {errors.name && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="location" className="text-sm">Location *</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Nuwara Eliya, Sri Lanka"
                  className="h-10"
                />
                {errors.location && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="area_hectares" className="text-sm">Area (Hectares) *</Label>
                <Input
                  id="area_hectares"
                  type="number"
                  step="0.1"
                  {...register("area_hectares", { valueAsNumber: true })}
                  placeholder="120.5"
                  className="h-10"
                />
                {errors.area_hectares && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.area_hectares.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="tea_variety" className="text-sm">Tea Variety *</Label>
                <Input
                  id="tea_variety"
                  {...register("tea_variety")}
                  placeholder="Ceylon Black Tea"
                  className="h-10"
                />
                {errors.tea_variety && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.tea_variety.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                <Label htmlFor="established_date" className="text-sm">Established Date</Label>
                <Input
                  id="established_date"
                  type="date"
                  {...register("established_date")}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
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