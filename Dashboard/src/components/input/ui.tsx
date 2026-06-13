"use client";

import styles from "./ui.module.css";

type InputType = "text" | "password" | "number" | "date";

type InputProps = {
  type?: InputType;
  label?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export default function Input({
  type = "text",
  label,
  value,
  placeholder,
  onChange
}: InputProps) {

  return (
    <div className={styles.input}>
      { label && <label>{label}</label> }

      <input 
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={styles.inputElement} 
      />
    </div>
  );
}