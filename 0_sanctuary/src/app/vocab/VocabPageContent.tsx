import { redirect } from "next/navigation";
import { loadStudyItems } from "@/lib/load-study-items";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { VocabReview } from "./vocab-review";

export type VocabTabId = "saved" | "add" | "quick-review";

function parseVocabTab(raw: string): VocabTabId | undefined {
  if (raw === "saved") return "saved";
  if (raw === "add") return "add";
  if (raw === "review" || raw === "quick-review") return "quick-review";
  return undefined;
}

type PageProps = {
  searchParams?: Promise<{ tab?: string; flow?: string }> | { tab?: string; flow?: string };
};

export async function VocabPageContent({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const initialTab = parseVocabTab(raw);
  const initialSavedItems = await loadStudyItems(supabase, user.id);

  return (
    <VocabReview
      initialTab={initialTab}
      initialSavedItems={initialSavedItems}
    />
  );
}
