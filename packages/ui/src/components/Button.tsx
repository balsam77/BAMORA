import styles from "./Button.module.css";

type ButtonVariant = "primary" | "ghost" | "accent";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function Button({
  children,
  variant = "primary",
  onClick,
  className,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, styles[variant], className].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
