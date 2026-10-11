"use client";

import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import { BrandName } from "@/components/brand/BrandName";
import { getSavedLanguage, type AppLanguage } from "@/lib/language";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import styles from "./LegalPageFrame.module.css";

type LocalizedText = {
  ar: string;
  he: string;
  en?: string;
};

type LocalizedSection = {
  heading: LocalizedText;
  paragraphs: LocalizedText[];
};

type LegalPageFrameProps = {
  activeHref: string;
  title: LocalizedText;
  intro: LocalizedText;
  sections?: LocalizedSection[];
  disclaimer?: LocalizedText;
  children?: ReactNode;
  renderExtra?: (language: AppLanguage) => ReactNode;
};

function textByLanguage(copy: LocalizedText, language: AppLanguage) {
  if (language === "he") {
    return copy.he;
  }

  if (language === "en") {
    return copy.en ?? copy.ar;
  }

  return copy.ar;
}

function resolveLanguage() {
  if (typeof window === "undefined") {
    return "ar" as AppLanguage;
  }

  return getSavedLanguage();
}

export function LegalPageFrame({
  activeHref,
  title,
  intro,
  sections = [],
  disclaimer,
  children,
  renderExtra,
}: LegalPageFrameProps) {
  const language = resolveLanguage();
  const isRtl = language !== "en";

  const homeLabel = useMemo(() => {
    if (language === "he") {
      return "חזרה ל-BAMORA";
    }

    if (language === "en") {
      return "Back to BAMORA";
    }

    return "العودة إلى BAMORA";
  }, [language]);

  return (
    <div className={styles.page} dir={isRtl ? "rtl" : "ltr"}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <BrandName />
          <p className={styles.brandHint}>Marketplace</p>
        </div>
        <Link href="/" className={styles.backLink}>{homeLabel}</Link>
      </header>

      <main className={styles.content}>
        <article className={styles.card}>
          <h1 className={styles.title}>{textByLanguage(title, language)}</h1>
          <p className={styles.intro}>{textByLanguage(intro, language)}</p>

          {sections.map((section) => (
            <section key={section.heading.he} className={styles.section}>
              <h2>{textByLanguage(section.heading, language)}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.he}>{textByLanguage(paragraph, language)}</p>
              ))}
            </section>
          ))}

          {renderExtra ? renderExtra(language) : null}
          {children}

          {disclaimer ? <p className={styles.disclaimer}>{textByLanguage(disclaimer, language)}</p> : null}
        </article>
      </main>

      <footer className={styles.footer}>
        <LegalFooterLinks activeHref={activeHref} />
      </footer>
    </div>
  );
}
