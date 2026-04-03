interface SetupEditorHrefOptions {
  setupId?: string | null;
  collabToken?: string | null;
}

function normalizeQueryValue(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getMapHref(mapId: string): string {
  return `/map/${mapId}`;
}

export function getSetupEditorHref(
  mapId: string,
  { setupId, collabToken }: SetupEditorHrefOptions = {},
): string {
  const params = new URLSearchParams();
  const normalizedSetupId = normalizeQueryValue(setupId);
  const normalizedCollabToken = normalizeQueryValue(collabToken);

  if (normalizedSetupId) {
    params.set("setupId", normalizedSetupId);
  }

  if (normalizedCollabToken) {
    params.set("collab", normalizedCollabToken);
  }

  const query = params.toString();
  return query ? `/map/${mapId}/edit?${query}` : `/map/${mapId}/edit`;
}