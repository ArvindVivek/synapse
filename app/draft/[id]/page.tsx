import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/synapse/AppShell";
import { DraftScreen } from "@/components/synapse/DraftScreen";
import { Button } from "@/components/kl";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Draft",
  // Draft pages are personal and saved only in one browser: keep them out of search.
  robots: { index: false },
};

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Draft ids are nanoid strings; anything else is a broken link.
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) notFound();
  return (
    <AppShell
      width="full"
      actions={
        <Button href="/draft/new" variant="ghost" size="sm" icon={Plus} className="hidden sm:inline-flex">
          New draft
        </Button>
      }
    >
      <DraftScreen id={id} />
    </AppShell>
  );
}
