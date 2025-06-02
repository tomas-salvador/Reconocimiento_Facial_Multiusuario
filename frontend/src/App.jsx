// frontend/src/App.jsx
import { useState } from "react";
import Dashboard     from "./pages/Dashboard";
import Identify      from "./pages/Identify";
import api           from "./api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [tab, setTab]     = useState("persons");

  async function login(e) {
    e.preventDefault();
    const { data } = await api.post("/auth/login", {
      email:    e.target.email.value,
      password: e.target.password.value,
    });
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  }

  if (!token) {
    return (
      <div className="container pt-5" style={{ maxWidth: 320 }}>
        <h4>Iniciar sesión</h4>
        <form onSubmit={login}>
          <input
            name="email"
            defaultValue="admin@example.com"
            className="form-control my-2"
            required
          />
          <input
            name="password"
            type="password"
            defaultValue="admin"
            className="form-control my-2"
            required
          />
          <button className="btn btn-primary w-100">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand fw-bold">Reconocimiento Facial</span>
        <div className="navbar-nav flex-row gap-4">
          <a
            className={`nav-link ${tab === "persons" ? "active" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => setTab("persons")}
          >
            Personas
          </a>
          <a
            className={`nav-link ${tab === "identify" ? "active" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => setTab("identify")}
          >
            Identificar
          </a>
        </div>
      </nav>

      {tab === "persons" ? <Dashboard /> : <Identify />}
    </>
  );
}
