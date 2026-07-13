// Build a screen-aspect mask canvas from the neon logo photo: threshold the
// luminance so the wordmark (letters + droplet) reads as white-on-black. The
// engine samples this both as a GL texture (display settle/ignite) and as CPU
// pixel data (biasing dye splats inside the letterforms).

export function buildLogoMask(url: string, aspect: number, widthFraction = 0.6): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = 1024;
      const h = Math.max(256, Math.round(w / aspect));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      const drawW = w * widthFraction;
      const drawH = drawW * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);

      const data = ctx.getImageData(0, 0, w, h);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
        const v = lum > 88 ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = v;
        px[i + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      // soften edges a touch so the shader falloff isn't aliased
      ctx.filter = "blur(2px)";
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = "none";
      resolve(canvas);
    };
    img.onerror = () => reject(new Error(`fluid mask: failed to load ${url}`));
    img.src = url;
  });
}
