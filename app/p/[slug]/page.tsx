import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicPage } from "@/components/public-page";
import type { Page, PublicLink } from "@/types/database";

async function resolve(slug: string): Promise<Page | null> {
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("public_links")
    .select("page_id")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();
  const pageId = (link as Pick<PublicLink, "page_id"> | null)?.page_id;
  if (!pageId) return null;

  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Page | null) ?? null;
}

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
