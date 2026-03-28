"use client";

import { NotebookText, SquarePen } from "lucide-react";
import { useState } from "react";
import { FreeWriterPanel } from "../_components/FreeWriterPanel";
import { FeedbackSection } from "../vocab/FeedbackSection";

const tabs = [
  { id: "thoughts" as const, Icon: NotebookText, label: "Thoughts" },
  { id: "write-now" as const, Icon: SquarePen, label: "Write now" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function WritingTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("thoughts");

  return (
    <>
      <div className="sticky top-0 z-40 -mx-6 mb-6 border-b border-slate-200 bg-[#FDFCFB]/95 px-6 pt-1 backdrop-blur">
        <nav
          aria-label="Thoughts and write now"
          className="flex gap-1.5 py-2 text-sm font-medium text-slate-600 sm:gap-2"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 transition-colors sm:gap-2 sm:px-3",
                  isActive
                    ? "bg-slate-950 text-[#FDFCFB]"
                    : "bg-transparent text-slate-700 hover:bg-slate-900/5 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon
                  className="h-[1.125rem] w-[1.125rem] shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="truncate text-xs sm:text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-0 py-8">
        {activeTab === "thoughts" && (
          <FeedbackSection hideSectionTitle />
        )}
        {activeTab === "write-now" && <FreeWriterPanel />}
      </div>
    </>
  );
}
