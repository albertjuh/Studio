
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";
import { Progress } from "@/components/ui/progress";

export default function AncRegisterPage() {
    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Andikisha Mshiriki / Register Participant</CardTitle>
                    <CardDescription>
                       Please fill in the details below. Fields with * are required.
                    </CardDescription>
                    <Progress value={33} className="w-full mt-2" />
                </CardHeader>
                <CardContent>
                   <AncRegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
