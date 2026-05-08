import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackAudio } from "../../lib/catalog-data";

export default function AudioPage() {
  return (
    <CatalogGridPage
      activeKey="audio"
      title="Audio"
      subtitle="Browse the published audio catalog."
      buildEndpoint={({ sort, query }) => {
        const params = new URLSearchParams();
        params.set("sort", sort || "latest");
        if (query) params.set("q", query);
        return query ? `/search?${params.toString()}&type=audio` : `/audio?${params.toString()}`;
      }}
      fallbackItems={listFallbackAudio()}
      sortOptions={[
        { value: "latest", label: "Latest" },
        { value: "title", label: "A-Z" },
      ]}
      defaultSort="latest"
      supportsQuery
      queryPlaceholder="Filter audio titles"
    />
  );
}
