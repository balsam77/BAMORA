import styles from "./Card.module.css";

type CardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
