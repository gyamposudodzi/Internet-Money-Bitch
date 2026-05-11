"use client";

import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackCartoons } from "../../lib/catalog-data";

export default function CartoonsPage() {
  return (
    <CatalogGridPage
      activeKey="cartoons"
      laneNotice="This lane uses catalog filters until a dedicated family feed is available from the API."
      themeClass="page-theme-cartoons"
      title="Cartoons"
      subtitle="Browse cartoon picks and animated family-friendly titles."
      buildEndpoint={({ query }) => {
        const params = new URLSearchParams();
        params.set("genre", "cartoon");
        if (query) {
          params.set("q", query);
        }
        return `/search?${params.toString()}`;
      }}
      fallbackItems={listFallbackCartoons()}
      supportsQuery
      queryPlaceholder="Filter cartoon titles"
    />
  );
}
