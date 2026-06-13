import { ReactNode } from "react";
import styles from "./ui.module.css";

type Buttonvariant = "success" | "cancel" | "primary" | "danger";
type ButtonType = "button" | "submit" | "reset";

export default function Button({
  children,
  variant="primary",
  type="button",
  disabled=false,
  onClick
} : {
  children: ReactNode;
  variant?:  Buttonvariant;
  type?: ButtonType;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
    type={type}
    disabled={disabled}
    className={`${styles.button} ${styles[variant]} ${disabled && styles.disabled}`}
    onClick={onClick}
    >
      {children}
    </button>
  )
}