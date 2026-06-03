
import { redirect } from 'next/navigation';

/**
 * DEPRECATED: S2 specific call plan has been replaced by the Global Call Plan.
 */
export default function LegacyCallPlan() {
  redirect('/anc/call-plan');
}
