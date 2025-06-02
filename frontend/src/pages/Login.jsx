import { useState } from "react";
import api, { setToken } from "../api";

export function Login({ onSuccess }) {
  const [email, setE] = useState("admin@example.com");
  const [pass,  setP] = useState("admin");
  const [msg,   setMsg]= useState("");

  async function submit(e){
    e.preventDefault();
    try{
      const {data} = await api.post("/auth/login",{email,password:pass});
      setToken(data.access_token);
      onSuccess(data.access_token);
    }catch{ setMsg("Credenciales inválidas"); }
  }
  return (
    <div className="container py-5">
      <form onSubmit={submit} className="card p-4 mx-auto" style={{maxWidth:340}}>
        <h5 className="mb-3">Login</h5>
        <input className="form-control mb-2" value={email}
               onChange={e=>setE(e.target.value)} required/>
        <input type="password" className="form-control mb-3" value={pass}
               onChange={e=>setP(e.target.value)} required/>
        <button className="btn btn-primary w-100">Entrar</button>
        {msg && <p className="text-danger mt-2">{msg}</p>}
      </form>
    </div>
  );
}
