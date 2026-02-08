
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight, Factory, Bike } from 'lucide-react';
import Link from 'next/link';

export default function ProjectSelectionPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-4xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Select a Project to Work On</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/login">
            <Card className="hover:border-primary transition-colors h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-6 w-6 text-primary" />
                  Coastal Insights
                </CardTitle>
                <CardDescription>
                  A comprehensive factory management application for a cashew processing plant in Mtwara, Tanzania.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Manage inventory, track production stages, generate reports, and get AI-powered insights for your factory operations.
                </p>
              </CardContent>
              <div className="p-6 pt-0 text-primary font-semibold flex items-center">
                Open Project <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Card>
          </Link>

          <Link href="/boda/login">
            <Card className="hover:border-primary transition-colors h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bike className="h-6 w-6 text-primary" />
                  Boda Fleet Management
                </CardTitle>
                <CardDescription>
                  A scalable, data-driven app to manage a rent-to-own boda-boda fleet remotely.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Manage riders, track payments, monitor GPS, and get automated reports on your rent-to-own boda fleet.
                </p>
              </CardContent>
              <div className="p-6 pt-0 text-primary font-semibold flex items-center">
                Open Project <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
