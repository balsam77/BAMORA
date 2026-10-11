import Link from "next/link";
import styles from "./LegalFooterLinks.module.css";

export const legalLinks = [
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/terms", label: "תקנון האתר" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/shipping-policy", label: "מדיניות משלוחים" },
  { href: "/returns-refunds", label: "ביטולים והחזרות" },
] as const;

type LegalFooterLinksProps = {
  activeHref?: string;
  className?: string;
};

export function LegalFooterLinks({ activeHref, className }: LegalFooterLinksProps) {
  const rootClassName = className ? `${styles.footer} ${className}` : styles.footer;

  return (
    <nav className={rootClassName} aria-label="Legal pages">
      {legalLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.href === activeHref ? `${styles.link} ${styles.linkActive}` : styles.link}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
