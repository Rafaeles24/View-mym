"use client";

import { ReactNode } from "react";
import styles from "./ui.module.css";

export default function Modal({
  children
}: {
  children: ReactNode
}) {
  return (
    <div className={styles.modal} >
      <div className={styles.modalContent}>
        {children}
      </div>
    </div>
  )
}