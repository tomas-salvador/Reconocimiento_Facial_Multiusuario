import { useEffect, useRef, useState } from "react";
import api             from "../api";
import CameraCapture   from "../components/CameraCapture";
import CropModal       from "../components/CropModal";
import { cropBase64 }  from "../utils/crop";

export default function Gallery({ person, onClose }) {
  // Estado
  const [faces,setFaces]   = useState([]);
  const [cam,setCam]       = useState(false);

  const [orig,setOrig]     = useState("");
  const [crops,setCrops]   = useState([]);
  const [edit,setEdit]     = useState(null);

  // Progreso
  const [detLoad,setDL]    = useState(false);
  const [detProg,setDP]    = useState(0);
  const [upLoad,setUL]     = useState(false);
  const [upProg,setUP]     = useState(0);

  const fileRef=useRef();

  useEffect(()=>{load();},[]);
  async function load(){
    const {data}=await api.get(`/persons/${person.id}/faces`);
    setFaces(data);
  }

  // Detección
  async function detectFiles(list){
    setDL(true); setDP(0);
    const tmp=[]; let first=orig;
    for(const f of list){
      const fd=new FormData(); fd.append("file",f);
      const {data}=await api.post("/faces/detect",fd,{
        onUploadProgress:e=>setDP(Math.round(e.loaded*100/e.total))
      });
      if(!first) first=data.image;
      for(const b of data.boxes)
        tmp.push({blob:await cropBase64(data.image,b),box:b});
    }
    setDL(false);
    if(tmp.length){ setOrig(first); setCrops(c=>[...c,...tmp]); }
  }
  const fromInput=e=>detectFiles([...e.target.files]);
  const fromCam  =f=>{setCam(false);detectFiles([f]);};

  // Subir
  async function confirm(){
    setUL(true); setUP(0);
    const fd=new FormData();
    crops.forEach(c=>fd.append("files",c.blob));
    fd.append("person_id",person.id);
    await api.post("/faces/bulk",fd,{
      onUploadProgress:e=>setUP(Math.round(e.loaded*100/e.total))
    });
    setUL(false); setCrops([]); setOrig(""); load();
  }

  // Helpers
  const delFace = id=>api.delete(`/faces/${id}`).then(load);
  const remCrop = i =>setCrops(c=>c.filter((_,idx)=>idx!==i));

  // UI
  return(
  <div className="modal d-block" style={{background:"#0007"}}>
    <div className="modal-dialog modal-lg"><div className="modal-content p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">{person.name}</h5>
        <div className="d-flex gap-2">
          <input id="fileAdd" type="file" multiple accept="image/*"
                 className="d-none" ref={fileRef} onChange={fromInput}/>
          <label htmlFor="fileAdd"
                 className="btn btn-sm btn-primary mb-0">Añadir fotos</label>
          <button className="btn btn-sm btn-secondary"
                  onClick={()=>setCam(true)}>Cámara</button>
        </div>
      </div>

      {/* Progreso detección */}
      {detLoad &&
        <div className="progress mb-2">
          <div className="progress-bar" style={{width:`${detProg}%`}}/>
        </div>}

      {/* Existentes */}
      <div className="d-flex flex-wrap gap-3">
        {faces.map(f=>(
          <div key={f.id} className="d-flex flex-column align-items-center">
            <img src={`http://localhost:8000/static/${f.name}`}
                 style={{width:100,height:100,objectFit:"cover",
                         border:"1px solid #ccc",borderRadius:6}}/>
            <button className="btn btn-sm btn-danger mt-2"
                    onClick={()=>delFace(f.id)}>🗑</button>
          </div>
        ))}
        {!faces.length && <p className="text-muted">Sin imágenes todavía.</p>}
      </div>

      {/* Recortes nuevos */}
      {crops.length>0 && <>
        <hr/>
        <h6 className="text-muted mb-2">Nuevos recortes</h6>
        <div className="d-flex flex-wrap gap-3 mb-3">
          {crops.map((c,i)=>(
            <div key={i} className="d-flex flex-column align-items-center">
              <img src={URL.createObjectURL(c.blob)}
                   style={{width:100,height:100,objectFit:"cover",
                           border:"1px solid #28a745",borderRadius:6}}
                   onClick={()=>setEdit(i)}/>
              <div className="btn-group mt-2">
                <button className="btn btn-sm btn-dark"
                        onClick={()=>setEdit(i)}>✎</button>
                <button className="btn btn-sm btn-danger"
                        onClick={()=>remCrop(i)}>🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Progreso subida */}
        {upLoad
          ? <div className="progress mb-2">
              <div className="progress-bar"
                   style={{width:`${upProg}%`}}/>
            </div>
          : <button className="btn btn-success w-100 mb-2"
                    onClick={confirm}>Subir a la persona</button>}
      </>}

      <button className="btn btn-link mt-2" onClick={onClose}>Cerrar</button>
    </div></div>

    {/* Modales auxiliares */}
    {cam   && <CameraCapture onCapture={fromCam}
                             onClose={()=>setCam(false)}/>}
    {edit!==null &&
      <CropModal imgB64={orig} box={crops[edit].box}
                 onSave={(blob,box)=>{
                   setCrops(c=>{
                     const n=[...c]; n[edit]={blob,box}; return n;});
                   setEdit(null);}}
                 onClose={()=>setEdit(null)}/>}
  </div>);
}
