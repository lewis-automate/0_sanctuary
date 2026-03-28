import { redirect } from "next/navigation";

/** @deprecated Use `/continue` — kept so old bookmarks still work. */
export default function ReaderDonePage() {
  redirect("/continue");
}
