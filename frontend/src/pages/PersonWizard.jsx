// frontend/src/pages/PersonWizard.jsx
import { useRef, useState } from "react";
import api                from "../api";
import CameraCapture      from "../components/CameraCapture";
import CropModal          from "../components/CropModal";
import { cropBase64 }     from "../utils/crop";

export default function PersonWizard({ onClose }) {
  const [step, setStep]     = useState(1);
  const [person, setPerson] = useState(null);
  const [saved, setSaved]   = useState(false);

  const [orig, setOrig]     = useState("");
  const [crops, setCrops]   = useState([]);      // {blob,box}
  const [edit, setEdit]     = useState(null);

  const [detLoad, setDL]    = useState(false);
  const [detProg, setDP]    = useState(0);
  const [upLoad,  setUL]    = useState(false);
  const [upProg,  setUP]    = useState(0);

  // Nuevo estado para controlar cuándo está lista la subida
  const [canUpload, setCanUpload] = useState(false);

  const [cam, setCam]       = useState(false);
  const nameRef             = useRef();

  // Crear persona
  async function next() {
    const name = nameRef.current.value.trim();
    if (!name) return;
    const { data } = await api.post("/persons/", { name });
    setPerson(data);
    setStep(2);
  }

  // Detección previa
  async function detectFiles(list) {
    setDL(true);
    setDP(0);
    // Impide subir hasta que termine esta detección
    setCanUpload(false);

    const tmp = [];
    let first = orig;

    for (const f of list) {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/faces/detect", fd, {
        onUploadProgress: (e) => setDP(Math.round((e.loaded * 100) / e.total)),
      });
      if (!first) first = data.image;
      for (const box of data.boxes) {
        const blob = await cropBase64(data.image, box);
        tmp.push({ blob, box });
      }
    }

    setDL(false);

    if (tmp.length) {
      setOrig(first);
      setCrops((c) => [...c, ...tmp]);
      setCanUpload(true);
    }
  }

  const fromInput = (e) => detectFiles([...e.target.files]);
  const fromCam = (f) => {
    const file = new File([f], `cam_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    setCam(false);
    detectFiles([file]);
  };

  // Editar o eliminar recorte
  const saveCrop = (blob, box) => {
    setCrops((c) => {
      const n = [...c];
      n[edit] = { blob, box };
      return n;
    });
    setEdit(null);
  };
  const remCrop = (i) => setCrops((c) => c.filter((_, idx) => idx !== i));

  // Subida final
  async function upload() {
    setUL(true);
    setUP(0);
    const fd = new FormData();
    crops.forEach((c) => fd.append("files", c.blob));
    fd.append("person_id", person.id);

    try {
      await api.post("/faces/bulk", fd, {
        onUploadProgress: (e) => setUP(Math.round((e.loaded * 100) / e.total)),
      });
      setSaved(true);
      onClose();
    } catch (error) {
      console.error("Error al subir:", error);
    } finally {
      setUL(false);
    }
  }

  // Cancelar
  async function cancel() {
    if (person && !saved) {
      try {
        await api.delete(`/persons/${person.id}`);
      } catch {}
    }
    onClose();
  }

  // UI
  return (
    <div className="modal d-block" style={{ background: "#0007" }}>
      <div className="modal-dialog">
        <div className="modal-content p-4">
          <h5 className="mb-3">Añadir persona</h5>

          {/* Nombre */}
          {step === 1 && (
            <>
              <input
                ref={nameRef}
                type="text"
                className="form-control mb-3"
                placeholder="Nombre"
              />
              <button className="btn btn-primary w-100" onClick={next}>
                Siguiente
              </button>
            </>
          )}

          {/* Detección */}
          {step === 2 && (
            <>
              <div className="d-flex gap-2 mb-3">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="form-control"
                  onChange={fromInput}
                  disabled={detLoad}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => setCam(true)}
                  disabled={detLoad}
                >
                  Cámara
                </button>
              </div>

              {detLoad && (
                <div className="progress mb-2">
                  <div
                    className="progress-bar"
                    style={{ width: `${detProg}%` }}
                  />
                </div>
              )}

              <div className="d-flex flex-wrap gap-3 mb-3">
                {crops.map((c, i) => (
                  <div
                    key={i}
                    className="d-flex flex-column align-items-center"
                  >
                    <img
                      src={URL.createObjectURL(c.blob)}
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: "cover",
                        border: "1px solid #28a745",
                        borderRadius: 6,
                      }}
                      onClick={() => setEdit(i)}
                    />
                    <div className="btn-group mt-2">
                      <button
                        className="btn btn-sm btn-dark"
                        onClick={() => setEdit(i)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => remCrop(i)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {upLoad ? (
                <div className="progress mb-2">
                  <div
                    className="progress-bar"
                    style={{ width: `${upProg}%` }}
                  />
                </div>
              ) : (
                <button
                  className="btn btn-success w-100 mb-2"
                  onClick={upload}
                  disabled={!canUpload || detLoad || upLoad}
                >
                  Subir
                </button>
              )}
            </>
          )}

          <button className="btn btn-link mt-2" onClick={cancel}>
            Cancelar
          </button>
        </div>
      </div>

      {cam && (
        <CameraCapture
          onCapture={fromCam}
          onClose={() => setCam(false)}
        />
      )}

      {edit !== null && (
        <CropModal
          imgB64={orig}
          box={crops[edit].box}
          onSave={saveCrop}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}
