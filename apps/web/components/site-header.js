import Link from "next/link";

const navItems = [
  { href: "/", label: "Home", key: "home" },
  { href: "/movies", label: "Movies", key: "movies" },
  { href: "/kdrama", label: "KDrama", key: "kdrama" },
  { href: "/series", label: "Series", key: "series" },
  { href: "/anime", label: "Anime", key: "anime" },
  { href: "/cartoons", label: "Cartoons", key: "cartoons" },
  { href: "/audio", label: "Audio", key: "audio" },
  { href: "/search", label: "Search", key: "search" },
];

export function SiteHeader({ activeKey }) {
  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <div className="navbar-brand">
          <Link className="brand-mark-link" href="/">
            <div className="brand-mark">IMB</div>
          </Link>
          <div className="brand-copy">
            <strong>Internet Money Bitch</strong>
            <span>Movies, series, and audio.</span>
          </div>
        </div>

        <div className="navbar-links-scroll">
          <nav className="navbar-links" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                className={`navbar-link ${activeKey === item.key ? "is-active" : ""}`}
                href={item.href}
                key={item.key}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
