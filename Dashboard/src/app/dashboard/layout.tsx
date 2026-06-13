import { ReactNode } from "react";
import styles from "./layout.module.css";
import Sidebar from "@/components/sidebar/ui";
import { AuthResponse } from "@/types/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getMe(): Promise<AuthResponse | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/auth/me`, {
    headers: {
      "Cookie": cookieHeader
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return null;
  }

  return await res.json() as AuthResponse;
}

export default async function Dashboard({
  children
}: {
  children: ReactNode
}) {
  const user = await getMe();

  if (!user) {
    redirect("/auth");
  } 

  return (
    <div className={styles.general}>

      <aside className={styles.aside}>
        <Sidebar user={user} />
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}