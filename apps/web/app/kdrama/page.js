"use client";

import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackKdrama } from "../../lib/catalog-data";

export default function KDramaPage() {
  return (
    <CatalogGridPage
      activeKey="kdrama"
      themeClass="page-theme-kdrama"
      title="KDrama"
      subtitle="A dedicated lane for Korean drama picks and serialized favorites."
      buildEndpoint={({ sort, query }) => {
        const params = new URLSearchParams();
        params.set("language", "ko");
        params.set("sort", sort || "featured");
        if (query) {
          params.set("q", query);
        }
        return `/series?${params.toString()}`;
      }}
      fallbackItems={listFallbackKdrama()}
      sortOptions={[
        { value: "latest", label: "Newest" },
        { value: "featured", label: "Featured" },
        { value: "title", label: "A-Z" },
      ]}
      defaultSort="featured"
      supportsQuery
      queryPlaceholder="Filter KDrama titles"
    />
  );
}
