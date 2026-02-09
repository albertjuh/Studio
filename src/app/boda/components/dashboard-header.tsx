
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
import { useLanguage } from "../lib/i18n";

export function BodaDashboardHeader() {
    const { t } = useLanguage();
    const [isAddRiderDialogOpen, setIsAddRiderDialogOpen] = useState(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [aiMessage, setAiMessage] = useState("");
    const { toast } = useToast();

    const handleSendAiMessage = () => {
        if (!aiMessage.trim()) return;
        console.log("Sending message to AI:", aiMessage);
        toast({
            title: t('messageSent'),
            description: t('messageSentDescription'),
        });
        setAiMessage("");
        setIsAiDialogOpen(false);
    };

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">{t('fleetDashboard')}</h1>
                <p className="text-muted-foreground">{t('fleetOverview')}</p>
            </div>
            <div className="flex gap-2">
                 <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('messageAI')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('messageAIAssistant')}</DialogTitle>
                            <DialogDescription>
                                {t('messageAIDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="ai-message">{t('yourRequest')}</Label>
                                <Textarea
                                    id="ai-message"
                                    placeholder={t('aiPlaceholder')}
                                    value={aiMessage}
                                    onChange={(e) => setAiMessage(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSendAiMessage} disabled={!aiMessage.trim()}>
                                {t('sendToAI')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

                 <Dialog open={isAddRiderDialogOpen} onOpenChange={setIsAddRiderDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('addRider')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{t('addNewRider')}</DialogTitle>
                            <DialogDescription>
                                {t('addNewRiderDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        <AddRiderForm onFormSubmit={() => setIsAddRiderDialogOpen(false)} />
                    </DialogContent>
                 </Dialog>
            </div>
        </div>
    )
}
