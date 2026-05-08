import { MediaDetailPage } from "../../../components/media-detail-page";

export default async function AudioDetailPage({ params }) {
  const resolvedParams = await params;
  return <MediaDetailPage activeKey="audio" contentType="audio" slug={resolvedParams.slug} />;
}
