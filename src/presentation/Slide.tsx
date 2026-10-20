import { useEffect, useRef, useState } from "react";
import { FileHeart, LockKeyhole, Stethoscope, Sparkles } from "lucide-react";
import clinic from "@/assets/stakeholder-clinic.jpg";
import slides from "./slides.json";

export { slides };

export function Slide({ index }: { index: number }) {
  const s = slides[index] ?? slides[0];
  if (!s) return null;
  const dark = index === 0 || index === 7;
  const Icon = index === 5 ? Sparkles : index === 4 ? LockKeyhole : index === 3 ? Stethoscope : FileHeart;
  return <article className={`mv-slide ${dark ? "mv-slide-dark" : ""}`}>
    {index === 0 && <img src={clinic} width={1536} height={1024} alt="Illustrative patient and doctor reviewing a digital health record" className="mv-cover" />}
    <header className="mv-slide-header"><span>MediVault AI</span><span>{s.kicker}</span></header>
    <div className="mv-slide-main">
      <h1 className={index === 0 ? "mv-slide-brand" : "mv-slide-title"}>{s.title}</h1>
      <p className="mv-slide-subtitle">{s.subtitle}</p>
      <div className={`mv-slide-points ${index === 3 ? "mv-slide-process" : ""}`}>{s.points.map((p, i) => <div key={p} className="mv-slide-point"><span className="mv-point-mark">{index === 3 ? String(i + 1).padStart(2, "0") : <Icon size={40} />}</span><p>{index === 3 ? p.replace(/^\d+ · /, "") : p}</p></div>)}</div>
    </div>
    <footer className="mv-slide-footer"><span>Fictional demonstration data · Not for clinical use{index === 0 ? " · Illustrative generated photograph" : ""}</span><span>{String(index + 1).padStart(2, "0")} / {slides.length}</span></footer>
  </article>;
}

export function ScaledSlide({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(entry.contentRect.width / 1920, entry.contentRect.height / 1080));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="mv-slide-stage"><div className="mv-slide-scaled" style={{ transform: `scale(${scale})` }}><Slide index={index} /></div></div>;
}