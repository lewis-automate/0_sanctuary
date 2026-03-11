import { redirect } from "next/navigation";
import { FadeIn } from "./_components/FadeIn";
import { CurrentActivities } from "./library/CurrentActivities";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: progressRows } = await supabase
    .from("user_progress")
    .select("stories_uuid")
    .eq("user_id", user.id);

  const storyIds = Array.from(
    new Set((progressRows ?? []).map((p) => p.stories_uuid).filter(Boolean)),
  ) as string[];

  let wordsRead = 0;
  let storiesRead = 0;

  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from("stories")
      .select("uuid, word_count")
      .in("uuid", storyIds);

    wordsRead =
      stories?.reduce(
        (sum, s) => sum + (typeof s.word_count === "number" ? s.word_count : 0),
        0,
      ) ?? 0;
    storiesRead = stories?.length ?? 0;
  }

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-8">
        <h1 className="text-xl font-semibold text-slate-900">Sanctuary</h1>

        <CurrentActivities />

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
            Stats
          </h2>
          <dl className="mt-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Words read
              </dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {wordsRead.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Stories read
              </dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {storiesRead.toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </FadeIn>
  );
}
