// Database types based on our Supabase schema
export interface Plantation {
  id: string
  name: string
  location: string
  area_hectares: number
  tea_variety: string
  number_of_plants: number | null
  established_date: string | null
  manager_id: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Worker {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  phone: string | null
  role: 'picker' | 'supervisor' | 'manager' | 'quality_controller'
  plantation_id: string | null
  hire_date: string | null
  salary: number | null
  status: 'active' | 'inactive' | 'terminated'
  created_at: string
  updated_at: string
}

export interface HarvestRecord {
  id: string
  plantation_id: string
  worker_id: string
  harvest_date: string
  quantity_kg: number
  grade: 'A' | 'B' | 'C'
  weather_condition: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface QualityControl {
  id: string
  harvest_record_id: string
  inspector_id: string
  inspection_date: string
  moisture_content: number | null
  leaf_quality_score: number | null
  color_rating: string | null
  aroma_rating: string | null
  overall_grade: string | null
  defects_found: string[] | null
  approved: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  plantation_id: string
  tea_type: string
  grade: 'A' | 'B' | 'C'
  quantity_kg: number
  unit_price: number | null
  storage_location: string | null
  expiry_date: string | null
  batch_number: string | null
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  plantation_id: string
  name: string
  type: string
  model: string | null
  purchase_date: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  status: 'operational' | 'maintenance' | 'repair' | 'retired'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WeatherData {
  id: string
  plantation_id: string
  record_date: string
  temperature_celsius: number | null
  humidity_percentage: number | null
  rainfall_mm: number | null
  wind_speed_kmh: number | null
  created_at: string
}

export interface SalesRecord {
  id: string
  plantation_id: string
  buyer_name: string
  buyer_contact: string | null
  sale_date: string
  tea_grade: 'A' | 'B' | 'C'
  quantity_kg: number
  unit_price: number
  total_amount: number
  payment_status: 'pending' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface WorkerWithPlantation extends Worker {
  plantation?: {
    id: string
    name: string
    location: string
  }
}

export interface HarvestRecordWithDetails extends HarvestRecord {
  plantation?: Plantation
  worker?: Worker
}

export interface HarvestRecordWithWorker extends HarvestRecord {
  worker?: {
    first_name: string
    last_name: string
  }
}

export interface HarvestRecordWithPlantation extends HarvestRecord {
  plantation?: {
    name: string
  }
}

// Partial plantation type for selections
export interface PlantationBasic {
  id: string
  name: string
  location: string
}

export interface QualityControlWithDetails extends QualityControl {
  harvest_record?: HarvestRecordWithDetails
  inspector?: Worker
}