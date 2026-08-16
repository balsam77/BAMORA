import styles from "./BamoraLogo.module.css";

type BamoraLogoProps = {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
};

export function BamoraLogo({
  size = "md",
  animated = false,
  className,
}: BamoraLogoProps) {
  return (
    <div
      className={[styles.logo, styles[size], animated ? styles.animated : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="BAMORA"
    >
      <span className={styles.mark} aria-hidden="true">
        B
      </span>
      <span className={styles.wordmark}>AMORA</span>
    </div>
  );
}
