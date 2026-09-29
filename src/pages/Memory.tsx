import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionLabel, StatCard, OutcomeBadge } from "@/components/common";
import { fmtDate } from "@/lib/fmt";
import { Search } from "lucide-react";

export default function Memory() {
  const memories = useQuery(api.memories.listMemories, {});
  const stats = useQuery(api.memories.memoryStats, {});

  const [q, setQ] = useState("");
  const [machine, setMachine] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [errorCode, setErrorCode] = useState("all");
  const [technician, setTechnician] = useState("all");
  const [sort, setSort] = useState("recent");

  const machineOptions = useMemo(
    () =>
      memories
        ? [...new Set(memories.map((m) => m.machine?.code).filter(Boolean))].sort() as string[]
        : [],
    [memories],
  );
  const techOptions = useMemo(
    () => (memories ? [...new Set(memories.map((m) => m.technician))].sort() : []),
    [memories],
  );
  const codeOptions = useMemo(
    () => (memories ? [...new Set(memories.map((m) => m.errorCode))].sort() : []),
    [memories],
  );

  const filtered = useMemo(() => {
    if (!memories) return [];
    const needle = q.trim().toLowerCase();
    const out = memories.filter((m) => {
      if (machine !== "all" && m.machine?.code !== machine) return false;
      if (outcome !== "all" && m.outcome !== outcome) return false;
      if (errorCode !== "all" && m.errorCode !== errorCode) return false;
      if (technician !== "all" && m.technician !== technician) return false;
      if (!needle) return true;
      return (
        m.code.toLowerCase().includes(needle) ||
        m.fault.toLowerCase().includes(needle) ||
        m.action.toLowerCase().includes(needle) ||
        m.technicianNotes.toLowerCase().includes(needle) ||
        m.learning.toLowerCase().includes(needle)
      );
    });
    out.sort((a, b) =>
      sort === "oldest" ? a.timestamp.localeCompare(b.timestamp) : b.timestamp.localeCompare(a.timestamp),
    );
    return out;
  }, [memories, q, machine, outcome, errorCode, technician, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Memory"
        subtitle="Every retained experience — failed repairs, successful fixes and technician knowledge."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total memories" value={stats?.total ?? "—"} tone="signal" />
        <StatCard label="Successful repairs" value={stats?.successful ?? "—"} tone="ok" />
        <StatCard label="Failed repairs" value={stats?.failed ?? "—"} tone="critical" />
        <StatCard label="Partial repairs" value={stats?.partial ?? "—"} tone="amber" />
        <StatCard label="Recurring faults" value={stats?.recurringFaults ?? "—"} />
        <StatCard label="Recently retained" value={stats?.recentlyRetained ?? "—"} />
      </div>

      <div className="mt-6 mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search memory ID, fault, action, notes…"
            className="pl-9"
          />
        </div>
        <Select value={machine} onValueChange={setMachine}>
          <SelectTrigger>
            <SelectValue placeholder="Machine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All machines</SelectItem>
            {machineOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger>
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={errorCode} onValueChange={setErrorCode}>
          <SelectTrigger>
            <SelectValue placeholder="Fault code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fault codes</SelectItem>
            {codeOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={technician} onValueChange={setTechnician}>
          <SelectTrigger>
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All technicians</SelectItem>
            {techOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {memories === undefined && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border border-border bg-card/40" />
          ))}
        </div>
      )}

      {memories && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center">
          <p className="text-sm font-medium">No memories match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adjust the search or filters. Resolving an incident will retain a new experience here.
          </p>
          <button
            className="mt-3 text-xs text-signal hover:underline"
            onClick={() => {
              setQ("");
              setMachine("all");
              setOutcome("all");
              setErrorCode("all");
              setTechnician("all");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {memories && filtered.length > 0 && (
        <p className="mb-2 font-mono text-xs text-muted-foreground">
          {filtered.length} of {memories.length} memories
        </p>
      )}

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <Link
            key={m._id}
            to={`/memory/${m._id}`}
            className="rounded-lg border border-border bg-card/60 p-4 transition-colors hover:border-signal/40"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">{fmtDate(m.timestamp)}</span>
              <OutcomeBadge outcome={m.outcome} />
            </div>
            <p className="mt-2 font-mono text-xs font-semibold text-foreground">{m.code}</p>
            <p className="mt-1 text-sm font-medium">
              {m.action}
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                {m.machine?.code} / {m.errorCode}
              </span>
            </p>
            <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
              “{m.technicianNotes}”
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
