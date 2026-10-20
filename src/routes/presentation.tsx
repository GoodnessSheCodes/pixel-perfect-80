import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Printer, NotebookPen, LayoutGrid, ShieldPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScaledSlide, Slide, slides } from "@/presentation/Slide";

export const Route = createFileRoute("/presentation")({
  validateSearch: (search: Record<string, unknown>) => ({ slide: Math.min(slides.length, Math.max(1, Number(search["slide"]) || 1)), print: search["print"] === true || search["print"] === "true" }),
  head: () => ({ meta: [
    { title: "Stakeholder presentation — MediVault AI" },
    { name: "description", content: "A stakeholder briefing on MediVault AI’s patient-controlled health records prototype, demo journey and readiness boundaries." },
    { property: "og:title", content: "MediVault AI stakeholder briefing" },
    { property: "og:description", content: "Patient-controlled records, the demo journey and the next validation step." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Presentation,
});

function Presentation() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const index = search.slide - 1;
  const [notes, setNotes] = useState(true);
  const [grid, setGrid] = useState(false);
  const [present, setPresent] = useState(false);
  const touch = useRef<number | null>(null);
  const go = (next: number) => { void navigate({ search: { ...search, slide: Math.max(1, Math.min(slides.length, next + 1)) }, replace: true }); };
  useEffect(() => {
    document.title = `${index + 1}/${slides.length} — ${slides[index]?.title} — MediVault AI`;
    const keys = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      if (e.key === "Escape") setPresent(false);
    };
    const full = () => { if (!document.fullscreenElement) setPresent(false); };
    window.addEventListener("keydown", keys); document.addEventListener("fullscreenchange", full);
    return () => { window.removeEventListener("keydown", keys); document.removeEventListener("fullscreenchange", full); };
  }, [index, search]);
  if (search.print) return <main className="mv-print">{slides.map((s, i) => <Slide key={s.title} index={i} />)}</main>;
  return <main className={`mv-presentation ${present ? "mv-presenting" : ""}`}>
    {!present && <header className="mv-toolbar"><Link to="/" className="flex items-center gap-2 font-display font-bold"><ShieldPlus className="text-primary" />MediVault AI</Link><span className="hidden text-sm text-muted-foreground md:block">Stakeholder briefing</span><div className="flex gap-1">
      <Button variant="ghost" size="icon" title="Slide overview" aria-label="Slide overview" onClick={() => setGrid(!grid)}><LayoutGrid /></Button>
      <Button variant="ghost" size="icon" title="Presenter notes" aria-label="Presenter notes" onClick={() => setNotes(!notes)}><NotebookPen /></Button>
      <Button variant="ghost" size="icon" title="Print or save PDF" aria-label="Print or save PDF" onClick={() => window.open("/presentation?print=true", "_blank", "noopener")}><Printer /></Button>
      <Button onClick={() => { setPresent(true); setGrid(false); void document.documentElement.requestFullscreen?.().catch(() => {}); }}><Maximize />Present</Button>
    </div></header>}
    {grid && !present ? <div className="mv-overview">{slides.map((s, i) => <Button key={s.title} variant="outline" className="mv-thumbnail" onClick={() => { go(i); setGrid(false); }}><ScaledSlide index={i} /><span>{i + 1}. {s.title}</span></Button>)}</div> : <div className="mv-canvas" onTouchStart={e => { touch.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { const end = e.changedTouches[0]?.clientX; if (touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 50) go(index + (end < touch.current ? 1 : -1)); touch.current = null; }}><ScaledSlide index={index} /></div>}
    <div className="mv-navigation"><Button variant="outline" size="icon" aria-label="Previous slide" title="Previous slide" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft /></Button><span>{index + 1} / {slides.length}</span><Button variant="outline" size="icon" aria-label="Next slide" title="Next slide" disabled={index === slides.length - 1} onClick={() => go(index + 1)}><ChevronRight /></Button>{present && <Button variant="outline" size="icon" title="Exit presentation" aria-label="Exit presentation" onClick={() => { setPresent(false); if (document.fullscreenElement) void document.exitFullscreen(); }}><X /></Button>}</div>
    {notes && !present && !grid && <aside className="mv-notes"><h2>Talking points · {slides[index]?.title}</h2><p>{slides[index]?.notes}</p></aside>}
  </main>;
}