
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function EnvVarsMissingError({ error }: { error?: Error }) {
  const defaultMessage = "The application's server cannot connect to Firebase because required environment variables are not set.";
  
  // A more specific message if the error provides it
  const specificError = error?.message.includes("missing:") 
    ? error.message.replace('Firebase Admin SDK setup failed. The following environment variables are missing: ', 'The server reported the following variables are missing: ')
    : defaultMessage;


  return (
    <Card className="max-w-3xl mx-auto my-8 border-destructive">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
                Action Required: Server Configuration
            </CardTitle>
            <CardDescription>
                {specificError}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm">
                To fix this, please double-check that you have added the following secrets correctly in your hosting provider's dashboard (e.g., Vercel, Netlify).
            </p>
            <div className="space-y-2 p-4 rounded-md bg-muted text-sm font-mono">
                <p>
                    <span className="font-semibold text-foreground">FIREBASE_PROJECT_ID</span>="your-project-id"
                </p>
                <p>
                    <span className="font-semibold text-foreground">FIREBASE_CLIENT_EMAIL</span>="your-client-email"
                </p>
                 <p>
                    <span className="font-semibold text-foreground">FIREBASE_PRIVATE_KEY</span>="-----BEGIN PRIVATE KEY-----\n..."
                </p>
            </div>
             <p className="text-sm text-muted-foreground">
                After setting these variables, you must **redeploy** your application for the changes to take effect. If you have already done this, check for any typos in the variable names.
            </p>
        </CardContent>
    </Card>
  );
}
