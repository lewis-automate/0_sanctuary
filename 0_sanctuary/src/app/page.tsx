import Link from "next/link";
import { redirect } from "next/navigation";
import { FadeIn } from "./_components/FadeIn";
import { QuickCreateStoryButton } from "./_components/QuickCreateStoryButton";
import { CurrentActivities } from "./library/CurrentActivities";
import { createClient } from "@/lib/supabase/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cutoffMs = Date.now() - THIRTY_DAYS_MS;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const [
    { data: progressRows },
    { count: savedVocabTotal },
    { count: savedVocab30d },
    { data: authorStoriesRows },
  ] = await Promise.all([
    supabase
      .from("user_progress")
      .select("stories_uuid, reading_date")
      .eq("user_id", user.id),
    supabase
      .from("study_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("study_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("date_added", cutoffIso),
    supabase
      .from("stories")
      .select("uuid")
      .eq("original_author_id", user.id)
      .order("creation_date", { ascending: false }),
  ]);

  const rows = progressRows ?? [];

  const readCountsByStory = new Map<string, number>();
  for (const p of rows) {
    if (p.stories_uuid) {
      readCountsByStory.set(
        p.stories_uuid,
        (readCountsByStory.get(p.stories_uuid) ?? 0) + 1,
      );
    }
  }

  let quickReadHref: string = "/library";
  for (const s of authorStoriesRows ?? []) {
    if ((readCountsByStory.get(s.uuid) ?? 0) === 0) {
      quickReadHref = `/reader?story=${encodeURIComponent(s.uuid)}`;
      break;
    }
  }
  const storyIds = Array.from(
    new Set(rows.map((p) => p.stories_uuid).filter(Boolean)),
  ) as string[];

  const wordCountByStory = new Map<string, number>();
  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from("stories")
      .select("uuid, word_count")
      .in("uuid", storyIds);
    for (const s of stories ?? []) {
      wordCountByStory.set(
        s.uuid,
        typeof s.word_count === "number" ? s.word_count : 0,
      );
    }
  }

  let wordsReadAllTime = 0;
  let wordsRead30d = 0;
  let completedReads30d = 0;

  for (const p of rows) {
    const wc = p.stories_uuid
      ? (wordCountByStory.get(p.stories_uuid) ?? 0)
      : 0;
    wordsReadAllTime += wc;
    const t = p.reading_date ? new Date(p.reading_date).getTime() : NaN;
    if (!Number.isNaN(t) && t >= cutoffMs) {
      wordsRead30d += wc;
      completedReads30d += 1;
    }
  }

  const completedReadsAllTime = rows.length;
  const savedWordsTotal = savedVocabTotal ?? 0;
  const savedWords30d = savedVocab30d ?? 0;

  const colHeader =
    "text-center text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500";
  const statLabel =
    "text-xs font-medium uppercase tracking-[0.16em] text-slate-500";
  const statNum = "text-base font-semibold tabular-nums text-slate-900 sm:text-lg";

  const quickActionBtn =
    "w-full rounded-2xl border border-slate-200 bg-[#fbf5ef]/90 px-4 py-3.5 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 active:bg-[#efe4d8]";

  const quickActionTitle = "block text-sm font-medium text-slate-900";
  const quickActionSub =
    "mt-1 block text-xs font-normal leading-snug text-slate-500";

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-8">
        <header className="mb-3 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Sanctuary
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <table className="w-full border-collapse text-sm text-slate-700">
            <thead>
              <tr>
                <th className="w-0 min-w-0 pb-2 pr-1 sm:pr-2" />
                <th className={`${colHeader} w-[5.5rem] pb-2 px-0.5 font-normal sm:w-[7rem]`}>
                  Last 30 days
                </th>
                <th className={`${colHeader} w-[5.5rem] pb-2 px-0.5 font-normal sm:w-[7rem]`}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${statLabel} py-2 pr-1 text-left align-middle font-normal sm:pr-2`}>
                  Words <br></br> read
                </th>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {wordsRead30d.toLocaleString()}
                </td>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {wordsReadAllTime.toLocaleString()}
                </td>
              </tr>
              <tr>
                <th scope="row" className={`${statLabel} py-2 pr-1 text-left align-middle font-normal sm:pr-2`}>
                  Passages <br></br> read
                </th>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {completedReads30d.toLocaleString()}
                </td>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {completedReadsAllTime.toLocaleString()}
                </td>
              </tr>
              <tr>
                <th scope="row" className={`${statLabel} py-2 pr-1 text-left align-middle font-normal sm:pr-2`}>
                  Vocab <br></br> saved
                </th>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {savedWords30d.toLocaleString()}
                </td>
                <td className={`${statNum} px-0.5 py-2 text-center align-middle`}>
                  {savedWordsTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-4">
          <div className="grid grid-cols-2 gap-3">
            <QuickCreateStoryButton
              className={quickActionBtn}
              titleClassName={quickActionTitle}
              subClassName={quickActionSub}
            />
            <Link href={quickReadHref} className={`${quickActionBtn} h-full`}>
              <span className={quickActionTitle}>Quick read</span>
              <span className={quickActionSub}>
                Read an unread passage from your library
              </span>
            </Link>
            <Link href="/vocab?tab=add" className={`${quickActionBtn} h-full`}>
              <span className={quickActionTitle}>Add vocab</span>
              <span className={quickActionSub}>Add vocabulary freely</span>
            </Link>
            <Link href="/writing?tab=writenow" className={`${quickActionBtn} h-full`}>
              <span className={quickActionTitle}>Write freely</span>
              <span className={quickActionSub}>
                Write freely and receive feedback on your writing
              </span>
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
            Current processes
          </h2>
          <div className="mt-4">
            <CurrentActivities />
          </div>
        </section>
      </div>
    </FadeIn>
  );
}
