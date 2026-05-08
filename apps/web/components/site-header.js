import Link from "next/link";

const navItems = [
  { href: "/movies", label: "Movies", key: "movies" },
  { href: "/series", label: "Series", key: "series" },
  { href: "/anime", label: "Anime", key: "anime" },
  { href: "/cartoons", label: "Cartoons", key: "cartoons" },
  { href: "/audio", label: "Audio", key: "audio" },
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

        <div className="navbar-spacer" />
      </div>
    </header>
  );
}
