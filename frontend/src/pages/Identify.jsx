import { useState } from "react";
import api from "../api";
import CameraCapture from "../components/CameraCapture";

export default function Identify() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [res, setRes] = useState(null);
  const [th, setTh] = useState(0.05);
  const [cam, setCam] = useState(false);

  async function run(f) {
    const blob = f || file;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreview(url);

    const fd = new FormData();
    fd.append("file", blob);
    fd.append("model", "dlib");
    const { data } = await api.post("/faces/identify", fd);
    setRes(data);
    setCam(false);
  }

  return (
    <div className="container py-4">
      <h3>Identificar persona</h3>

      <div className="btn-group mb-3">
        <button
          className={`btn ${!cam ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setCam(false);
            setRes(null);       // Limpiar resultado al cambiar a Archivo
          }}
        >
          Archivo
        </button>
        <button
          className={`btn ${cam ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            setCam(true);
            setRes(null);       // Limpiar resultado al cambiar a Cámara
          }}
        >
          Cámara
        </button>
      </div>

      {cam ? (
        <CameraCapture
          onCapture={(blob) => run(blob)}
          onClose={() => {
            setCam(false);
            setRes(null);       // Limpiar al cerrar la cámara
          }}
        />
      ) : (
        <div className="d-flex gap-2 mb-3">
          <input
            type="file"
            accept="image/*"
            className="form-control"
            onChange={(e) => {
              const f = e.target.files[0];
              setFile(f);
              setPreview(URL.createObjectURL(f));
              setRes(null);     // Limpiar resultado al seleccionar una nueva imagen
            }}
          />
          <button
            className="btn btn-warning"
            onClick={() => run()}
            disabled={!file}
          >
            Reconocer
          </button>
        </div>
      )}

      {/* Preview de la imagen seleccionada o capturada */}
      {preview && (
        <div
          className="mb-4 mx-auto"
          style={{
            width: "300px",
            height: "300px",
            overflow: "hidden",
          }}
        >
          <img
            src={preview}
            alt="Vista previa"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>
      )}

      {/* Resultado */}
      {res && (
        <div
          className={`card text-center ${
            res.match && res.distance <= th ? "border-success" : "border-danger"
          }`}
        >
          <div
            className={`card-body ${
              res.match && res.distance <= th ? "text-success" : "text-danger"
            }`}
          >
            {res.match && res.distance <= th ? (
              <>
                Coincide con <strong>{res.match}</strong>
                <br />
                Distancia {res.distance.toFixed(4)}
              </>
            ) : (
              <>
                No coincide con nadie
                <br />
                Distancia más baja {res.distance?.toFixed(4) ?? "—"}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
