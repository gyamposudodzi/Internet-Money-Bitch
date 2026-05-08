import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackSeries } from "../../lib/catalog-data";

export default function SeriesPage() {
  return (
    <CatalogGridPage
      activeKey="series"
      title="Series"
      subtitle="Browse the published series catalog."
      buildEndpoint={({ sort, query }) => {
        const params = new URLSearchParams();
        params.set("sort", sort || "latest");
        if (query) {
          params.set("q", query);
        }
        return `/series?${params.toString()}`;
      }}
      fallbackItems={listFallbackSeries()}
      sortOptions={[
        { value: "latest", label: "Latest" },
        { value: "featured", label: "Featured" },
        { value: "title", label: "A-Z" },
      ]}
      defaultSort="latest"
      supportsQuery
      queryPlaceholder="Filter series titles"
    />
  );
}
