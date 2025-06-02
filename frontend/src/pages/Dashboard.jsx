import { useEffect, useState, useRef } from "react";
import api from "../api";
import PersonWizard from "./PersonWizard";
import Gallery      from "./Gallery";

export default function Dashboard() {
  const [people, setPeople]   = useState([]);
  const [wizard, setWizard]   = useState(false);
  const [gallery, setGallery] = useState(null);
  const fileInputRef          = useRef();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get("/persons/");
    setPeople(data);
  }

  async function delPerson(id) {
    if (!window.confirm("¿Eliminar persona?")) return;
    await api.delete(`/persons/${id}`);
    load();
  }

  // Exportar ZIP
  async function exportData() {
    const response = await api.get("/persons/export-zip", { responseType: "blob" });
    const blob = new Blob([response.data], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "persons_export.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Importar ZIP
  async function onFileChange(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await api.post("/persons/import-zip", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    load();
  }

  return (
    <div className="container py-4">
      <h3 className="mb-4">Personas</h3>

      {/* Controles: Nuevo / Exportar / Importar */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        <button
          className="btn btn-success"
          style={{ width: 160 }}
          onClick={() => setWizard(true)}
        >
          + Nueva
        </button>
        <button
          className="btn btn-secondary"
          style={{ width: 160 }}
          onClick={exportData}
        >
          Exportar
        </button>
        <button
          className="btn btn-secondary"
          style={{ width: 160 }}
          onClick={() => fileInputRef.current.click()}
        >
          Importar
        </button>
        <input
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={onFileChange}
        />
      </div>

      {/* Tarjetas de personas */}
      <div className="d-flex flex-wrap gap-3">
        {people.map((p) => (
          <div key={p.id} className="card p-3" style={{ width: 160 }}>
            <h6 className="mb-3">{p.name}</h6>
            <button
              className="btn btn-outline-primary btn-sm w-100 mb-2"
              onClick={() => setGallery(p)}
            >
              Ver
            </button>
            <button
              className="btn btn-outline-danger btn-sm w-100"
              onClick={() => delPerson(p.id)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {wizard && (
        <PersonWizard
          onClose={() => {
            setWizard(false);
            load();
          }}
        />
      )}

      {gallery && (
        <Gallery
          person={gallery}
          onClose={() => {
            setGallery(null);
            load();
          }}
        />
      )}
    </div>
  );
}
