import { Metadata } from "next"
import { PlantationOverview } from "./_components/plantation-overview"
import { HarvestTrendsChart } from "./_components/harvest-trends-chart"
import { RecentHarvestTable } from "./_components/recent-harvest-table"

export const metadata: Metadata = {
  title: "Tea Plantation Dashboard",
  description: "Overview of tea plantation operations, harvest tracking, and performance metrics",
}

export default function TeaPlantationDashboard() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tea Plantation Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your plantation operations, harvest trends, and worker productivity
          </p>
        </div>
      </div>

      <PlantationOverview />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <HarvestTrendsChart />
        <div className="space-y-6">
          {/* Add more charts or widgets here */}
        </div>
      </div>

      <RecentHarvestTable />
    </div>
  )
}