import { notFound } from "next/navigation";
import { MapDetailPageClient } from "@/components/pages/map-detail-page-client";
import { getMapById, getRankedMapStaticParams } from "@/lib/maps";

export function generateStaticParams() {
  return getRankedMapStaticParams();
}

export default async function MapDetailPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params;

  if (!getMapById(mapId)) {
    notFound();
  }

  return <MapDetailPageClient mapId={mapId} />;
}
