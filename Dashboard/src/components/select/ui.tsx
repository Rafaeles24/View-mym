"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";
import FlechaAbajoIcon from "@/icons/flechaAbajo";

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  clearLabel = "Todos"
} : {
  label?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearLabel?: string;
}) {
  const [ open, setOpen ] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ( ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);

  return (
    <div ref={ref} className={styles.select}>
      {label && <p>{label}</p>}

      <div onClick={() => setOpen(!open)} className={styles.input}>
        {selected?.label || placeholder} 
        <FlechaAbajoIcon />
      </div>

      { open && (
        <div className={styles.dropdown}>
          <div
            onClick={() => {
              onChange("");
              setOpen(false);
            }}

            className={styles.dropItems}
          >
            {clearLabel}
          </div>

          {options.map(opt => (
            <div 
              key={opt.value} 
              onClick={() => { 
                onChange(opt.value); 
                setOpen(false);
              }} 
              className={`${styles.dropItems} ${
                value === opt.value && styles.active
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}