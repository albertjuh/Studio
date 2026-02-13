
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, Loader2, KeyRound, User as UserIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '../lib/i18n';

// In a real app, this would be a database check
const USERS = {
    owner: { password: 'password', name: 'Owner' },
    supervisor: { password: 'password', name: 'Field Supervisor' },
    rider: { password: 'password', name: 'Rider' }
};

export default function BodaLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'supervisor' | 'rider'>('rider');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const userCredentials = USERS[role];
    let isLoginValid = false;
    let loggedInUserName = '';

    if (userCredentials && password === userCredentials.password) {
        if (role === 'owner' || role === 'supervisor') {
            // For owner/supervisor, username must match the role name
            if (username.toLowerCase() === role) {
                isLoginValid = true;
                loggedInUserName = userCredentials.name;
            }
        } else { // Rider login is more permissive for this prototype
            isLoginValid = true;
            // Use the entered username as the rider's name
            loggedInUserName = username;
        }
    }

    if (isLoginValid) {
        setTimeout(() => {
            toast({ title: t('loginSuccessful'), description: `${t('welcome')}, ${loggedInUserName}.`, variant: "success" });
            localStorage.setItem('bodaUser', JSON.stringify({ name: loggedInUserName, role: role }));
            router.push('/boda/dashboard');
        }, 500);
    } else {
        setTimeout(() => {
            toast({
                title: t('loginFailed'),
                description: t('incorrectCredentials'),
                variant: "destructive"
            });
            setIsLoading(false);
        }, 500);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
                <Bike className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">{t('boda')}</h1>
                <p className="text-muted-foreground">{t('loginToManage')}</p>
            </div>
        
            <Card className="w-full max-w-sm">
                <form onSubmit={handleLogin}>
                    <Tabs defaultValue="rider" onValueChange={(v) => setRole(v as any)} className="w-full">
                        <CardHeader>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="rider">{t('rider')}</TabsTrigger>
                                <TabsTrigger value="supervisor">{t('supervisor')}</TabsTrigger>
                                <TabsTrigger value="owner">{t('owner')}</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="username">{t('username')}</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="username" 
                                        type="text" 
                                        placeholder={role === 'rider' ? t('enterYourUsername') : t(role)}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                        required
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('password')}</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="password" 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        required
                                        placeholder={t('password')}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isLoading || !username || !password}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? t('verifying') : t('login')}
                            </Button>
                        </CardFooter>
                    </Tabs>
                </form>
            </Card>
        </div>
    </div>
  );
}
