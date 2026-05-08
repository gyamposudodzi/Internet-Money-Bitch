import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackAnime } from "../../lib/catalog-data";

export default function AnimePage() {
  return (
    <CatalogGridPage
      activeKey="anime"
      title="Anime"
      subtitle="This lane is prepared for anime-focused catalog pages."
      endpoint="/search?q=anime"
      fallbackItems={listFallbackAnime()}
    />
  );
}
