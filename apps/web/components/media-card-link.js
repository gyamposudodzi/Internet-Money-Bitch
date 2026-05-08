import Link from "next/link";

import { hrefForItem } from "../lib/catalog-data";

export function MediaCardLink({ item }) {
  return (
    <Link
      className="media-card-link"
      href={hrefForItem(item)}
      style={item.poster_url ? { backgroundImage: `url("${item.poster_url}")` } : undefined}
    >
      <div className="media-card-copy">
        <p className="eyebrow">{item.content_type}</p>
        <h4>{item.title}</h4>
        <p>{item.release_year || "Fresh drop"}</p>
      </div>
    </Link>
  );
}
