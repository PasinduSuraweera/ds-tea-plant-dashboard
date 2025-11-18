-- Tea Plantation Management System Database Schema
-- Execute these commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- 1. Plantations Table
CREATE TABLE IF NOT EXISTS plantations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  area_hectares DECIMAL(10,2) NOT NULL,
  tea_variety VARCHAR(100) NOT NULL,
  established_date DATE,
  altitude_meters INTEGER,
  soil_type VARCHAR(100),
  manager_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL, -- 'picker', 'supervisor', 'manager', 'quality_controller'
  plantation_id UUID REFERENCES plantations(id),
  hire_date DATE,
  salary DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Harvest Records Table
CREATE TABLE IF NOT EXISTS harvest_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_id UUID REFERENCES plantations(id) NOT NULL,
  worker_id UUID REFERENCES workers(id) NOT NULL,
  harvest_date DATE NOT NULL,
  quantity_kg DECIMAL(8,2) NOT NULL,
  grade VARCHAR(10) NOT NULL, -- 'A', 'B', 'C'
  weather_condition VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quality Control Table
CREATE TABLE IF NOT EXISTS quality_control (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  harvest_record_id UUID REFERENCES harvest_records(id) NOT NULL,
  inspector_id UUID REFERENCES workers(id) NOT NULL,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moisture_content DECIMAL(5,2),
  leaf_quality_score INTEGER CHECK (leaf_quality_score >= 1 AND leaf_quality_score <= 10),
  color_rating VARCHAR(20),
  aroma_rating VARCHAR(20),
  overall_grade VARCHAR(10),
  defects_found TEXT[],
  approved BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_id UUID REFERENCES plantations(id) NOT NULL,
  tea_type VARCHAR(100) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(8,2),
  storage_location VARCHAR(255),
  expiry_date DATE,
  batch_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_id UUID REFERENCES plantations(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  purchase_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  status VARCHAR(50) DEFAULT 'operational',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Weather Data Table
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_id UUID REFERENCES plantations(id) NOT NULL,
  record_date DATE NOT NULL,
  temperature_celsius DECIMAL(4,1),
  humidity_percentage DECIMAL(4,1),
  rainfall_mm DECIMAL(6,2),
  wind_speed_kmh DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Sales Records Table
CREATE TABLE IF NOT EXISTS sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plantation_id UUID REFERENCES plantations(id) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_contact VARCHAR(255),
  sale_date DATE NOT NULL,
  tea_grade VARCHAR(10) NOT NULL,
  quantity_kg DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_harvest_records_date ON harvest_records(harvest_date);
CREATE INDEX IF NOT EXISTS idx_harvest_records_plantation ON harvest_records(plantation_id);
CREATE INDEX IF NOT EXISTS idx_workers_plantation ON workers(plantation_id);
CREATE INDEX IF NOT EXISTS idx_quality_control_date ON quality_control(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inventory_plantation ON inventory(plantation_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_date ON weather_data(record_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(sale_date);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plantations_updated_at BEFORE UPDATE ON plantations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_harvest_records_updated_at BEFORE UPDATE ON harvest_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_control_updated_at BEFORE UPDATE ON quality_control 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_records_updated_at BEFORE UPDATE ON sales_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO plantations (name, location, area_hectares, tea_variety, established_date, altitude_meters, soil_type) VALUES
('Highland Tea Estate', 'Nuwara Eliya', 120.5, 'Ceylon Black Tea', '1985-03-15', 1850, 'Loamy'),
('Valley Green Plantation', 'Kandy District', 85.3, 'Green Tea', '1990-07-22', 1200, 'Clay Loam'),
('Mountain Peak Estate', 'Badulla', 150.0, 'White Tea', '1978-11-10', 2100, 'Sandy Loam');

INSERT INTO workers (employee_id, first_name, last_name, email, phone, role, plantation_id, hire_date, salary) VALUES
('EMP001', 'Saman', 'Perera', 'saman.perera@email.com', '+94771234567', 'manager', (SELECT id FROM plantations LIMIT 1), '2020-01-15', 75000),
('EMP002', 'Kamala', 'Silva', 'kamala.silva@email.com', '+94771234568', 'supervisor', (SELECT id FROM plantations LIMIT 1), '2021-03-20', 55000),
('EMP003', 'Nimal', 'Fernando', 'nimal.fernando@email.com', '+94771234569', 'picker', (SELECT id FROM plantations LIMIT 1), '2022-06-10', 35000),
('EMP004', 'Sandya', 'Rajapakse', 'sandya.rajapakse@email.com', '+94771234570', 'quality_controller', (SELECT id FROM plantations LIMIT 1), '2021-09-05', 50000);