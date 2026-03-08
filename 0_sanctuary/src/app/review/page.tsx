"use client";

import { useState } from "react";
import { FadeIn } from "../_components/FadeIn";

const tabs = [
  { id: "vocab", label: "Vocab" },
  { id: "bites", label: "Bites" },
  { id: "feedback", label: "Feedback" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<TabId>("vocab");

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-left">
        Review
      </p>

      <div className="sticky top-0 z-40 -mx-6 mb-6 border-b border-slate-200 bg-[#FDFCFB]/95 px-6 pt-1 backdrop-blur">
        <nav
          aria-label="Review sections"
          className="flex gap-2 py-2 text-sm font-medium text-slate-600"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-1 rounded-full px-3 py-2 transition-colors",
                  isActive
                    ? "bg-slate-900 text-[#FDFCFB]"
                    : "bg-transparent text-slate-700 hover:bg-slate-900/5 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[50vh] py-8">
        {activeTab === "vocab" && (
          <section aria-label="Vocab" className="text-sm text-slate-500">
            Vocab space, ready for cards.
          </section>
        )}

        {activeTab === "bites" && (
          <section aria-label="Bites" className="text-sm text-slate-500">
            Bites space, ready for short exercises.
          </section>
        )}

        {activeTab === "feedback" && (
          <section aria-label="Feedback" className="text-sm text-slate-500">
            Feedback space, ready for reflections.
          </section>
        )}
      </div>
    </FadeIn>
  );
}

