import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackSeries } from "../../lib/catalog-data";

export default function SeriesPage() {
  return (
    <CatalogGridPage
      activeKey="series"
      title="Series"
      subtitle="Browse the published series catalog."
      endpoint="/series"
      fallbackItems={listFallbackSeries()}
    />
  );
}
