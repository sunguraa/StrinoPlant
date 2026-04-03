import { notFound } from "next/navigation";
import { SetupEditorPageClient } from "@/components/pages/setup-editor-page-client";
import { getMapById, getRankedMapStaticParams } from "@/lib/maps";

export function generateStaticParams() {
  return getRankedMapStaticParams();
}

export default async function SetupEditorPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params;

  if (!getMapById(mapId)) {
    notFound();
  }

  return <SetupEditorPageClient mapId={mapId} />;
}