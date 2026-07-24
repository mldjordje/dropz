"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";

type CraftProps = { index: string; title: string; body: string };

export function Craft({ index, title, body }: CraftProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play(); else video.pause();
    setPlaying(!video.paused);
  };

  return (
    <section className="craft craft-v2" id="craft">
      <div className="craft-v2__stage">
      <div className="craft-v2__portrait"><Image src="/media/A4_09892.webp" alt="Dragan, tattoo artist and owner of Dropz Tattoo" fill sizes="45vw" priority={false} /></div>
      <div className="craft__media">
        <video ref={videoRef} autoPlay muted loop playsInline poster="/media/dragan-poster.webp">
          <source src="/media/dragan-loop.webm" type="video/webm" />
          <source src="/media/dragan-loop.mp4" type="video/mp4" />
        </video>
        <div className="craft__shade" />
      </div>
      <span className="craft__index">{index}</span>
      <h2 className="craft__title"><span>NE PRATIMO</span><span>TRENDOVE.</span><span>OSTAVLJAMO TRAGOVE.</span></h2>
      <p className="craft__body">{body}</p>
      <button className="video-control" type="button" onClick={toggle} aria-label={playing ? "Pause video" : "Play video"}>
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      </div>
    </section>
  );
}
