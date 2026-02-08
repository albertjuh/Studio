import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function BodaDashboardHeader() {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
                <p className="text-muted-foreground">High-level overview of your boda fleet operations.</p>
            </div>
            <div className="flex gap-2">
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Rider
                </Button>
            </div>
        </div>
    )
}
