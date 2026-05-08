import { CatalogGridPage } from "../../components/catalog-grid-page";
import { listFallbackMovies } from "../../lib/catalog-data";

export default function MoviesPage() {
  return (
    <CatalogGridPage
      activeKey="movies"
      title="Movies"
      subtitle="Browse the published movie catalog."
      endpoint="/movies?sort=latest"
      fallbackItems={listFallbackMovies()}
    />
  );
}
