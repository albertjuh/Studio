
import { redirect } from 'next/navigation';

/**
 * Application Root Redirect
 * Automatically routes all incoming traffic from the base URL 
 * to the PartoMa Project Activities Hub.
 */
export default function RootPage() {
  redirect('/anc/activities');
}
