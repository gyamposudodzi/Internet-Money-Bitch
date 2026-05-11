"use client";

import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackMovies } from "../../lib/catalog-data";

export default function MoviesPage() {
  return (
    <CatalogGridPage
      activeKey="movies"
      title="Movies"
      subtitle="Browse the published movie catalog."
      buildEndpoint={({ sort, query }) => {
        const params = new URLSearchParams();
        params.set("sort", sort || "latest");
        if (query) params.set("q", query);
        return query ? `/search?${params.toString()}&type=movie` : `/movies?${params.toString()}`;
      }}
      fallbackItems={listFallbackMovies()}
      sortOptions={[
        { value: "latest", label: "Latest" },
        { value: "featured", label: "Featured" },
        { value: "popular", label: "Popular" },
      ]}
      defaultSort="latest"
      supportsQuery
      queryPlaceholder="Filter movie titles"
    />
  );
}
