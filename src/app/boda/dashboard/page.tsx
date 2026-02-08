"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, DollarSign, AlertTriangle, Users } from "lucide-react";

export default function BodaDashboardPage() {
    // Placeholder data
    const metrics = {
        activeBikes: 12,
        totalBikes: 15,
        paymentsToday: 85000,
        incidents: 2,
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
                    <p className="text-muted-foreground">High-level overview of your boda fleet operations.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Bikes</CardTitle>
                        <Bike className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeBikes} / {metrics.totalBikes}</div>
                        <p className="text-xs text-muted-foreground">Bikes currently on the road</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Collections Today</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TZS {metrics.paymentsToday.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total daily profit collected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.incidents}</div>
                        <p className="text-xs text-muted-foreground">Accidents or maintenance issues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Riders</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalBikes}</div>
                        <p className="text-xs text-muted-foreground">Total riders in the program</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Coming Soon: Rider Payments</CardTitle>
                        <CardDescription>A table showing daily payment status for each rider.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">This section will be implemented soon.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Coming Soon: Fleet Map</CardTitle>
                        <CardDescription>A live map showing the location of all active bikes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">This section will be implemented soon.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
