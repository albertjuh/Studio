
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  History,
  Info,
  ChevronRight,
  Eye,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { type AncRegistration } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { IdBadge } from '@/app/anc/components/id-badge';

export default function AdminReviewQueue() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const reviewQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'anc_registrations'), where('requires_admin_review', '==', true));
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(reviewQuery);

  const handleApproveWithdrawal = async (p: AncRegistration) => {
    if (!firestore) return;
    try {
        const update: any = {
            requires_admin_review: false,
            study_status: 'withdrawn',
            updatedAt: serverTimestamp()
        };

        if (p.data_retention_preference === 'delete') {
            // In a real prod app, we might anonymize fields here. 
            // For MVP, we'll mark as anonymized.
            update.is_anonymized = true;
            update.name = "WITHDRAWN PARTICIPANT";
            update.phoneNumber = [];
            update.alternativeContact = "REDACTED";
        }

        await updateDoc(doc(firestore, 'anc_registrations', p.id), update);
        
        await addDoc(collection(firestore, `anc_registrations/${p.id}/timeline_events`), {
            event_type: 'protocol_deviation',
            event_date: serverTimestamp(),
            outcome: 'Withdrawal Approved & Processed by Admin',
            notes: `Data retention preference: ${p.data_retention_preference}. Review cycle complete.`,
            logged_by: 'ADMIN SYSTEM',
            created_at: serverTimestamp()
        });

        toast({ title: "Review Complete", variant: "success" });
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl"><Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">Review Queue</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ethical Clearances & Protocol Deviations</p>
            </div>
        </div>
        <Badge className="bg-rose-600 text-white font-black px-4 py-1.5 rounded-full">{participants?.length || 0} Pending</Badge>
      </div>

      <div className="space-y-4">
        {!participants || participants.length === 0 ? (
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2rem] bg-muted/20">
                <CardContent className="py-32 flex flex-col items-center justify-center gap-4 grayscale opacity-40">
                    <ShieldCheck className="h-12 w-12 text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest">Operational Integrity Maintained: Queue Empty</p>
                </CardContent>
            </Card>
        ) : (
            participants.map(p => (
                <Card key={p.id} className="border-none ring-1 ring-rose-200 shadow-lg rounded-2xl overflow-hidden bg-white hover:ring-rose-400 transition-all">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[9px] uppercase h-5">Review Required</Badge>
                                <IdBadge id={p.participantId} hideLabel />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason: {p.withdrawal_reason?.replace(/_/g, ' ') || 'Protocol Deviation'}</p>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-rose-800">Retention Preference: {p.data_retention_preference?.toUpperCase()}</p>
                                    <p className="text-xs font-medium text-rose-700 italic">"{p.withdrawal_notes || 'No notes provided.'}"</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <Button variant="outline" asChild className="h-11 px-6 rounded-xl font-bold border-2">
                                <Link href={`/anc/participants/${encodeURIComponent(p.id)}`}><Eye className="h-4 w-4 mr-2" /> View Dossier</Link>
                            </Button>
                            <Button onClick={() => handleApproveWithdrawal(p)} className="h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Finalize Withdrawal
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
}
