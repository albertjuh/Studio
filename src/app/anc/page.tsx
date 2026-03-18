
import { redirect } from 'next/navigation';

/**
 * Antenatal Care Module Root Redirect
 * Ensures that users navigating to /anc are automatically 
 * directed to the primary Activities Hub.
 */
export default function AncRootPage() {
  redirect('/anc/activities');
}
