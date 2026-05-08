import { MediaDetailPage } from "../../../components/media-detail-page";

export default async function SeriesDetailPage({ params }) {
  const resolvedParams = await params;
  return <MediaDetailPage activeKey="series" contentType="series" slug={resolvedParams.slug} />;
}
