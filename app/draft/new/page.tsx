import type { Metadata } from "next";
import { AppShell } from "@/components/synapse/AppShell";
import { SetupForm } from "@/components/synapse/SetupForm";

export const metadata: Metadata = {
  title: "Start a draft",
  description: "Pick your side, the draft format and a sample opponent to scout, then start drafting.",
};

export default function NewDraftPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-large font-semibold text-ink">Start a draft</h1>
        <p className="mt-1 text-[17px] text-ink-2">Three choices, then you&apos;re in champion select.</p>
      </div>
      <SetupForm />
    </AppShell>
  );
}
