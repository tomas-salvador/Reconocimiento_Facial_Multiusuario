export async function cropBase64(imageB64, box){
  const [t,r,b,l] = box;
  const img = await loadImg(imageB64);
  const canvas = document.createElement("canvas");
  canvas.width  = r - l;
  canvas.height = b - t;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, l, t, r-l, b-t, 0, 0, r-l, b-t);
  return new Promise(res=>canvas.toBlob(
      blob=>res(blob), "image/jpeg", 0.92));
}
function loadImg(b64){
  return new Promise(ok=>{
    const i=new Image();
    i.src=`data:image/jpeg;base64,${b64}`; i.onload=()=>ok(i);
  });
}
