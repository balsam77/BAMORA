"use client";

import { LegalFooterLinks } from "./LegalFooterLinks";
import styles from "./StorefrontFooter.module.css";

export function StorefrontFooter() {
  return (
    <footer className={styles.footer}>
      <LegalFooterLinks />
    </footer>
  );
}
