import styles from "./BottomNav.module.css";

type BottomNavItem = {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
};

type BottomNavProps = {
  items: BottomNavItem[];
  onSelect?: (id: string) => void;
};

export function BottomNav({ items, onSelect }: BottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.active ? styles.activeItem : styles.item}
          aria-current={item.active ? "page" : undefined}
          onClick={() => onSelect?.(item.id)}
        >
          <span aria-hidden="true" className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
