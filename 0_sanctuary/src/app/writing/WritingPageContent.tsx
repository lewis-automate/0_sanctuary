import { loadFeedbackItems } from "@/lib/load-feedback-items";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import { WritingTabs } from "./WritingTabs";

type TabId = "thoughts" | "write-now";

function parseWritingTab(raw: string): TabId | undefined {
  if (raw === "thoughts") return "thoughts";
  if (raw === "write-now" || raw === "writenow") return "write-now";
  return undefined;
}

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export async function WritingPageContent({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";
  const initialTab = parseWritingTab(raw);

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const initialFeedbackItems = await loadFeedbackItems(supabase, user.id);

  return (
    <WritingTabs
      initialTab={initialTab}
      initialFeedbackItems={initialFeedbackItems}
    />
  );
}
