
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddRiderForm } from "./add-rider-form";
import { useState } from "react";

export function BodaDashboardHeader() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
                <p className="text-muted-foreground">High-level overview of your boda fleet operations.</p>
            </div>
            <div className="flex gap-2">
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Rider
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Rider</DialogTitle>
                            <DialogDescription>
                                Add a new rider to your fleet and assign them a bike.
                            </DialogDescription>
                        </DialogHeader>
                        <AddRiderForm onFormSubmit={() => setIsDialogOpen(false)} />
                    </DialogContent>
                 </Dialog>
            </div>
        </div>
    )
}
