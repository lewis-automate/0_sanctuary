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
    .select("raw_input, alternate_version, feedback, focus_point")
    .eq("id", feedbackId)
    .eq("user_id", user.id)
    .maybeSingle();

  const studyItem = {
    rawInput: fbRow?.raw_input == null ? "" : String(fbRow.raw_input),
    alternateVersion:
      fbRow?.alternate_version == null ? null : String(fbRow.alternate_version),
    feedback: fbRow?.feedback == null ? null : String(fbRow.feedback),
    focusPoint: fbRow?.focus_point == null ? null : String(fbRow.focus_point),
  };

  return (
    <FadeIn className="mx-auto flex h-[calc(100dvh-5.5rem)] min-h-0 w-full max-w-5xl flex-col">
      <PracticeChatClient feedbackId={feedbackId} studyItem={studyItem} />
    </FadeIn>
  );
}
