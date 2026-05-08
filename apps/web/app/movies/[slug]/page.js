import { MediaDetailPage } from "../../../components/media-detail-page";

export default async function MovieDetailPage({ params }) {
  const resolvedParams = await params;
  return <MediaDetailPage activeKey="movies" contentType="movie" slug={resolvedParams.slug} />;
}
