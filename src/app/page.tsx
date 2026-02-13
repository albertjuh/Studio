import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect immediately to the ANC project login page
  redirect('/anc/login');
}
