import styles from "./BrandName.module.css";

type BrandNameProps = {
  className?: string;
};

export function BrandName({ className }: BrandNameProps) {
  return <span className={[styles.brandName, className].filter(Boolean).join(" ")}>BAMORA</span>;
}
