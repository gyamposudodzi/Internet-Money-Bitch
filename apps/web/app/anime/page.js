"use client";

import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackAnime } from "../../lib/catalog-data";

export default function AnimePage() {
  return (
    <CatalogGridPage
      activeKey="anime"
      laneNotice="This lane uses catalog filters until a dedicated anime feed is available from the API."
      themeClass="page-theme-anime"
      title="Anime"
      subtitle="Browse anime releases and animated serial favorites."
      buildEndpoint={({ query }) => {
        const params = new URLSearchParams();
        params.set("genre", "anime");
        if (query) {
          params.set("q", query);
        }
        return `/search?${params.toString()}`;
      }}
      fallbackItems={listFallbackAnime()}
      supportsQuery
      queryPlaceholder="Filter anime titles"
    />
  );
}
