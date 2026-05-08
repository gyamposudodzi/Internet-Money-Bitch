import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackAudio } from "../../lib/catalog-data";

export default function AudioPage() {
  return (
    <CatalogGridPage
      activeKey="audio"
      title="Audio"
      subtitle="Browse the published audio catalog."
      endpoint="/audio"
      fallbackItems={listFallbackAudio()}
    />
  );
}
