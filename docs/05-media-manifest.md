# 05 — Media Manifest

All source assets live in [`../media/`](../media/). These are the ONLY assets
provided. Treat them as precious; art-direct around them.

## Logo
| File | Notes |
|---|---|
| `logo.jpg` | 933×933. Neon purple `dropz tattoo` wordmark on black, droplet on the `z`. **The hero of the WebGL draw (doc 03).** First job: **vectorize to clean SVG** (wordmark + droplet as stroke paths). Also export transparent PNG variants. |

## Video
| File | Notes |
|---|---|
| `Dragan 6.mp4` | ~52s, ~42MB, needs work. **Transcode before use:** web-optimized H.264 mp4 + WebM/AV1, target ≤6–8MB, muted, looped, `playsInline`. Generate a **poster frame** (LCP-safe). Use full-bleed in "The Craft" section (doc 02, §3); optionally a muted ambient loop peeking in the hero. Probe real resolution/orientation with ffprobe before layout. |

## Photography (13 stills)
Documentary studio shots — mostly **portrait** orientation, high-res (1–5MB each),
natural light, black-clad artist, real tattoo work. Editorial and gritty — perfect
for full-bleed and the kinetic gallery.

| File | Approx size |
|---|---|
| `DSC04808.jpeg` | 5.1 MB (largest / highest res — hero-grade) |
| `IMG_2288.jpeg` | 3.9 MB |
| `IMG_8123.jpeg` | 3.5 MB |
| `IMG_0941.jpeg` | 3.2 MB |
| `FullSizeRender.jpeg` | 2.9 MB |
| `IMG_4676.jpeg` | 2.3 MB |
| `IMG_1098.jpeg` | 2.0 MB |
| `IMG_0451.jpeg` | 1.9 MB |
| `IMG_0459.jpeg` | 1.8 MB |
| `IMG_4652.jpeg` | 1.8 MB |
| `IMG_0799.jpeg` | 1.8 MB |
| `IMG_4595.jpeg` | 1.7 MB |
| `IMG_0617.jpeg` | 1.2 MB |
| `IMG_1892.jpeg` | 1.5 MB |
| `IMG_5691.jpeg` | 1.5 MB |
| `IMG_0319.jpeg` | 1.4 MB |
| `A4_09892.jpeg` | 0.2 MB (portrait of artist mid-work — good "The Craft" / about) |

## Handling rules
- **Optimize everything**: convert to AVIF/WebP with responsive `srcset`, strip EXIF,
  Next `<Image>` or a CDN. No raw multi-MB JPEGs shipped to the client.
- Duotone/grade toward the brand: lift blacks slightly, push a purple tint into
  shadows so photos sit in the palette without looking filtered.
- Curate — you don't have to use all 17. Pick the strongest 6–9 for the gallery,
  1 hero-grade still, 1 artist portrait. Quality over quantity.
- No stock imagery. If you need texture (grain, ink splatter), generate it, don't
  import off-brand stock.

## Missing / to request from client (flag, don't block)
- Studio address, working hours, phone, socials, artist name(s)/bio.
- Any additional portfolio shots (more variety strengthens the gallery).
