import { notFound, redirect } from "next/navigation";
import { FadeIn } from "../../../_components/FadeIn";
import { isSafeFeedbackIdParam } from "@/lib/feedback-id-param";
import { createClient } from "@/lib/supabase/server";
import { PracticeChatClient } from "./PracticeChatClient";

type PageProps = {
  params: Promise<{ feedbackId: string }>;
};

export default async function PracticeChatPage({ params }: PageProps) {
  const { feedbackId } = await params;
  if (!isSafeFeedbackIdParam(feedbackId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: fbRow } = await supabase
    .from("feedback")
    .select("focus_point")
    .eq("id", feedbackId)
    .eq("user_id", user.id)
    .maybeSingle();

  const focusPoint =
    fbRow?.focus_point == null ? null : String(fbRow.focus_point);

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <PracticeChatClient feedbackId={feedbackId} focusPoint={focusPoint} />
    </FadeIn>
  );
}
