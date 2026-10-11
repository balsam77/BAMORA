import { homepageCards } from "@bamora/ui";
import styles from "./HomepageCards.module.css";

export function HomepageCards() {
  return (
    <div className={styles.grid}>
      {homepageCards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={styles.card}
          aria-label={card.titleAr}
        >
          <span className={styles.overlay} aria-hidden="true" />
          <span className={styles.content}>
            <span className={styles.titleAr}>
              {card.titleAr}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
