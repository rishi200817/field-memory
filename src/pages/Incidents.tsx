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
import { PageHeader, OutcomeBadge, SeverityBadge } from "@/components/common";
import { fmtDateTime } from "@/lib/fmt";
import { Search } from "lucide-react";

type SortKey = "date-desc" | "date-asc" | "machine" | "severity";

const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Incidents() {
  const incidents = useQuery(api.incidents.listIncidents, {});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [machineCode, setMachineCode] = useState("all");
  const [sort, setSort] = useState<SortKey>("date-desc");

  const machineOptions = useMemo(
    () =>
      incidents
        ? [...new Set(incidents.map((i) => i.machine?.code).filter(Boolean))].sort() as string[]
        : [],
    [incidents],
  );

  const filtered = useMemo(() => {
    if (!incidents) return [];
    const needle = q.trim().toLowerCase();
    const out = incidents.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (severity !== "all" && i.severity !== severity) return false;
      if (machineCode !== "all" && i.machine?.code !== machineCode) return false;
      if (!needle) return true;
      return (
        i.code.toLowerCase().includes(needle) ||
        i.fault.toLowerCase().includes(needle) ||
        i.errorCode.toLowerCase().includes(needle) ||
        (i.action ?? "").toLowerCase().includes(needle) ||
        (i.technician ?? "").toLowerCase().includes(needle)
      );
    });
    out.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "machine":
          return (a.machine?.code ?? "").localeCompare(b.machine?.code ?? "") || b.date.localeCompare(a.date);
        case "severity":
          return severityRank[a.severity] - severityRank[b.severity] || b.date.localeCompare(a.date);
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return out;
  }, [incidents, q, status, severity, machineCode, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Incidents"
        subtitle="Every fault event with its action, outcome and technician record."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, fault, error code, technician…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger>
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={machineCode} onValueChange={setMachineCode}>
          <SelectTrigger>
            <SelectValue placeholder="Machine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All machines</SelectItem>
            {machineOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="machine">By machine</SelectItem>
            <SelectItem value="severity">By severity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {incidents === undefined && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border border-border bg-card/40" />
          ))}
        </div>
      )}

      {incidents && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center">
          <p className="text-sm font-medium">No incidents match</p>
          <p className="mt-1 text-xs text-muted-foreground">Adjust the search or filters.</p>
          <button
            className="mt-3 text-xs text-signal hover:underline"
            onClick={() => {
              setQ("");
              setStatus("all");
              setSeverity("all");
              setMachineCode("all");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {incidents && filtered.length > 0 && (
        <>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            {filtered.length} of {incidents.length} incidents
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Incident</th>
                  <th className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Machine</th>
                  <th className="hidden px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Date</th>
                  <th className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fault</th>
                  <th className="hidden px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">Code</th>
                  <th className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="hidden px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i._id} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link to={`/incidents/${i._id}`} className="text-signal hover:underline">
                        {i.code}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{i.machine?.name}</td>
                    <td className="hidden px-3 py-2 font-mono text-[11px] text-muted-foreground md:table-cell">
                      {fmtDateTime(i.date)}
                    </td>
                    <td className="px-3 py-2 text-xs">{i.fault}</td>
                    <td className="hidden px-3 py-2 font-mono text-[11px] sm:table-cell">{i.errorCode}</td>
                    <td className="px-3 py-2">
                      <OutcomeBadge outcome={i.status} />
                    </td>
                    <td className="hidden max-w-52 truncate px-3 py-2 text-xs text-muted-foreground lg:table-cell">
                      {i.action ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
