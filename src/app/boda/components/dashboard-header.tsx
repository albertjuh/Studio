
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddRiderForm } from "./add-rider-form";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function BodaDashboardHeader() {
    const [isAddRiderDialogOpen, setIsAddRiderDialogOpen] = useState(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [aiMessage, setAiMessage] = useState("");
    const { toast } = useToast();

    const handleSendAiMessage = () => {
        if (!aiMessage.trim()) return;
        console.log("Sending message to AI:", aiMessage);
        toast({
            title: "Message Sent",
            description: "Your request is being processed by the AI assistant.",
        });
        setAiMessage("");
        setIsAiDialogOpen(false);
    };

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
                <p className="text-muted-foreground">High-level overview of your boda fleet operations.</p>
            </div>
            <div className="flex gap-2">
                 <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Message AI
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Message AI Assistant</DialogTitle>
                            <DialogDescription>
                                Ask the AI to perform tasks, generate reports, or provide insights.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="ai-message">Your Request</Label>
                                <Textarea
                                    id="ai-message"
                                    placeholder="e.g., 'Summarize payments for last week' or 'Which bike needs maintenance soon?'"
                                    value={aiMessage}
                                    onChange={(e) => setAiMessage(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSendAiMessage} disabled={!aiMessage.trim()}>
                                Send to AI
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

                 <Dialog open={isAddRiderDialogOpen} onOpenChange={setIsAddRiderDialogOpen}>
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
                        <AddRiderForm onFormSubmit={() => setIsAddRiderDialogOpen(false)} />
                    </DialogContent>
                 </Dialog>
            </div>
        </div>
    )
}
