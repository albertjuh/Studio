import { redirect } from 'next/navigation';

// Although this page just redirects, explicitly defining the props
// can help Next.js correctly handle server component rendering and avoid
// internal errors related to params enumeration.
export default function HomePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  redirect('/login');
}
