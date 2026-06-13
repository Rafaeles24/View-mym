"use client";

import Button from "@/components/button/ui";
import Input from "@/components/input/ui";
import Modal from "@/forms/ui";
import { FormEvent, useState } from "react";
import styles from "./ui.module.css";

export default function AuthUI() {

  const [ username, setUsername ] = useState("");
  const [ password, setPassword ] = useState("");

  const [ error, setError ] = useState("");
  const [ loginOk, setLoginOk ] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    // Aquí iría la lógica de autenticación, por ejemplo, una llamada a una API
    if (!username || !password) {
      setError("Por favor, complete todos los campos");
      return;
    }

    try {
      // Consumir api auth
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error en el login");
        return;
      }
      setLoginOk(true);

      window.location.href = "/dashboard"; // Redirigir al dashboard
    } catch (error) {
      console.error("Error en el login:", error);
      setError("Error en el login");
    }
  }

  return (
    <div>
      <Modal>
        <form onSubmit={handleLogin} className={styles.form}>
          <h1>Iniciar sesión</h1>
          <Input 
            type="text" 
            label="Usuario"
            placeholder="Nombre de usuario" 
            value={username} 
            onChange={setUsername}
          />

          <Input 
            type="password" 
            label="Contraseña"
            placeholder="Contraseña" 
            value={password} 
            onChange={setPassword}
          />

          { error && <p style={{ color: "red" }}>{error}</p> }

          <Button
            variant="primary"
            type="submit"
            disabled={loginOk}
          >
            { loginOk ? "Login OK, ingresando..." : "Ingresar" }
          </Button>
        </form>
      </Modal>
    </div>
  )
}