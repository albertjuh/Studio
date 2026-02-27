
import { redirect } from 'next/navigation';

export default function RootPage() {
  // This is the root of the project.
  // Immediately redirect to the ANC project's activities hub.
  redirect('/anc/activities');
}
