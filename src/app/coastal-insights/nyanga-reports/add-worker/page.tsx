
"use client";
import { redirect } from 'next/navigation';

// This page is part of an inactive application and has been disabled.
export default function DisabledPage() {
    redirect('/anc/login');
}
