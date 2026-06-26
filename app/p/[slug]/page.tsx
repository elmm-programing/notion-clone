import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicPage } from "@/components/public-page";
import type { Page } from "@/types/database";

// cache() dedupes the lookup across generateMetadata + the page render.
const resolve = cache(async (slug: string): Promise<Page | null> => {
  const supabase = await createClient();
  // SECURITY DEFINER resolver: returns a page only for an exact enabled slug
  // (no enumeration, no broad anon SELECT on pages).
  const { data } = await supabase.rpc("get_public_page", { p_slug: slug });
  const rows = (data as Page[] | null) ?? [];
  return rows[0] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolve(slug);
  return { title: page ? page.title || "Untitled" : "Not found" };
}

export default async function PublicRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await resolve(slug);
  if (!page) notFound();
  return <PublicPage page={page} />;
}
