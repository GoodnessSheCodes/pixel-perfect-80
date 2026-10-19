import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles } from "lucide-react";
import { askAssistant } from "@/lib/ai.functions";
import { errMsg } from "@/lib/me";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/assistant")({
  head: () => ({ meta: [{ title: "AI assistant — MediVault AI" }] }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };
const QUICK = [
  "Explain the medical terms in my record",
  "Summarise my medical history",
  "Summarise my latest prescription",
  "Help me prepare questions for my next visit",
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await ask({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", content: r.text }]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI health assistant" subtitle="Understand your own records in plain language. Not a substitute for your doctor." />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK.map((q) => <Button key={q} size="sm" variant="outline" onClick={() => send(q)} disabled={busy}>{q}</Button>)}
        </div>
        <div className="min-h-64 space-y-4">
          {msgs.length === 0 && <p className="text-sm text-muted-foreground">Ask a question about your records, or pick a quick action above.</p>}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-xl bg-primary p-3 text-sm text-primary-foreground" : "max-w-[90%] rounded-xl bg-muted p-3 text-sm"}>
              {m.role === "assistant" && <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary"><Sparkles className="h-3 w-3" />AI-generated explanation</p>}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" rows={2} />
          <Button type="submit" disabled={busy || !input.trim()}><Send /></Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">This assistant only explains what's already in your record. It does not diagnose or change medication. In an emergency call 10177 or 112.</p>
      </Card>
    </div>
  );
}
