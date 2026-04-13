
import { redirect } from 'next/navigation';

/**
 * Redirect from legacy observations to the new IDI Registry
 */
export default function ObservationsRedirect() {
  redirect('/anc/idi');
}
