
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";

export default function AncRegisterPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>New Participant Registration</CardTitle>
                    <CardDescription>
                        Fill out the form below to enroll a new participant in the study.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <AncRegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
