import type { ReactNode } from "react";
import styles from "./ScreenShell.module.css";

type ScreenShellProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function ScreenShell({ children, footer }: ScreenShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.content}>{children}</div>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </div>
  );
}
