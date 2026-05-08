import Link from "next/link";

const quickLinks = [
  { href: "/", label: "Home Base", meta: "Main landing page" },
  { href: "/movies", label: "Movie Drops", meta: "Latest releases" },
  { href: "/kdrama", label: "KDrama Wave", meta: "Korean picks" },
  { href: "/series", label: "Series Lane", meta: "Ongoing stories" },
  { href: "/anime", label: "Anime Shelf", meta: "Animated favorites" },
  { href: "/cartoons", label: "Cartoon Corner", meta: "Family picks" },
  { href: "/audio", label: "Audio Picks", meta: "Tracks and albums" },
];

const adCards = [
  {
    title: "Sponsored Spotlight",
    copy: "Reserve this block for a premium placement tied to a new release campaign.",
  },
  {
    title: "Rewarded Ad Space",
    copy: "A clean sidebar slot for static or rotating ad creatives without interrupting browsing.",
  },
];

export function CatalogSidebar({ activeKey }) {
  return (
    <aside className="catalog-sidebar">
      <section className="sidebar-card sidebar-card-feature">
        <p className="eyebrow">Explorer</p>
        <h3>Browse with intent</h3>
        <p>
          Move through the catalog by lane, keep the page focused, and leave space for ads without
          crowding the titles.
        </p>
      </section>

      <section className="sidebar-card">
        <div className="sidebar-head">
          <p className="eyebrow">Quick Jump</p>
          <h3>Sections</h3>
        </div>
        <div className="sidebar-link-list">
          {quickLinks.map((item) => (
            <Link
              className={`sidebar-link ${activeKey === item.href.replace("/", "") ? "is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <strong>{item.label}</strong>
              <span>{item.meta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sidebar-card">
        <div className="sidebar-head">
          <p className="eyebrow">Ads</p>
          <h3>Available placements</h3>
        </div>
        <div className="sidebar-ad-stack">
          {adCards.map((card) => (
            <article className="sidebar-ad-card" key={card.title}>
              <span className="sidebar-ad-tag">Ad</span>
              <h4>{card.title}</h4>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
