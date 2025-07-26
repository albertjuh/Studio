import { redirect } from 'next/navigation';

export default function HomePage({
  params,
  searchParams
}: {
  params?: { slug?: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  redirect('/login');
}
