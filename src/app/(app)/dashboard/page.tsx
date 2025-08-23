
import { DashboardClient } from './dashboard-client';

export default function DashboardPage({ params, searchParams }: { params: {}; searchParams: {} }) {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Factory Health Dashboard</h2>
        <div className="text-muted-foreground text-lg">
          Overall Status & Trends
        </div>
      </div>
      <DashboardClient params={params} searchParams={searchParams} />
    </div>
  );
}
