import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackCartoons } from "../../lib/catalog-data";

export default function CartoonsPage() {
  return (
    <CatalogGridPage
      activeKey="cartoons"
      title="Cartoons"
      subtitle="This lane is prepared for cartoons and animated family content."
      endpoint="/search?q=cartoon"
      fallbackItems={listFallbackCartoons()}
    />
  );
}
