import { useState }           from "react";
import Cropper                from "react-easy-crop";
import Slider                 from "@mui/material/Slider";
import { cropBase64 }         from "../utils/crop";

export default function CropModal({ imgB64, box, onSave, onClose }) {
  const [crop,  setCrop ] = useState({ x: 0, y: 0 });
  const [zoom,  setZoom ] = useState(1);
  const [area,  setArea ] = useState(null);

  return (
    <div className="modal d-block" style={{ background: "#0008" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">

          <div style={{ position: "relative", width: "100%", height: 400 }}>
            <Cropper
              image={`data:image/jpeg;base64,${imgB64}`}
              crop={crop} zoom={zoom}
              aspect={1}
              cropSize={null}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPx) => setArea(areaPx)}
              initialCroppedAreaPixels={{
                x: box[3], y: box[0],
                width : box[1] - box[3],
                height: box[2] - box[0],
              }}
              showGrid={false}
            />
          </div>

          <Slider value={zoom} min={1} max={4} step={0.1}
                  className="my-3"
                  onChange={(_,z)=>setZoom(z)} />

          <div className="d-flex gap-3 justify-content-end">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary"
                    onClick={async()=>{
                      // Recortar usando util
                      const blob = await cropBase64(imgB64, [
                        area.y, area.x+area.width,
                        area.y+area.height, area.x
                      ]);
                      onSave(blob, [
                        area.y, area.x+area.width,
                        area.y+area.height, area.x
                      ]);
                    }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
