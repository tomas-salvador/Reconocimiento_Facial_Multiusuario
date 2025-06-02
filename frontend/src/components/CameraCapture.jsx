import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture, onClose }) {
  const [ready, setReady]   = useState(false);
  const videoRef            = useRef(null);
  const streamRef           = useRef(null);

  // Iniciar cámara
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:true });
        if (!mounted) return;
        streamRef.current         = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setReady(true);
        };
      } catch {
        alert("No se pudo acceder a la cámara");
        onClose();
      }
    })();

    return () => { mounted = false; stop(); };
  }, []);

  // Detener y liberar
  function stop() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }

  // Capturar
  async function shoot() {
    const track = streamRef.current.getVideoTracks()[0];
    if ("ImageCapture" in window) {
      try {
        const capture = new ImageCapture(track);
        const blob    = await capture.takePhoto();
        stop();
        const file = new File([blob],
                              `cam_${Date.now()}.jpg`,
                              { type:"image/jpeg" });
        onCapture(file);
        return;
      } catch
    }

    // Fallback universal: CANVAS
    const v       = videoRef.current;
    const canvas  = document.createElement("canvas");
    canvas.width  = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v,0,0);
    stop();
    canvas.toBlob(blob=>{
      const file = new File([blob],
                            `cam_${Date.now()}.jpg`,
                            { type:"image/jpeg" });
      onCapture(file);
    },"image/jpeg",0.95);
  }

  return (
    <div className="modal d-block" style={{ background:"#0007" }}>
      <div className="modal-dialog">
        <div className="modal-content p-3">
          <video ref={videoRef}
                 style={{ width:"100%", borderRadius:6 }} />
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary flex-fill"
                    disabled={!ready}
                    onClick={shoot}>Capturar</button>
            <button className="btn btn-link" onClick={()=>{ stop(); onClose(); }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
