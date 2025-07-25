import { redirect } from 'next/navigation';

// Next.js 15 requires params and searchParams to be Promise types
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // In Next.js 15, you need to await params and searchParams if you use them
  // Since you're just redirecting, you don't need to await them
  redirect('/login');
}