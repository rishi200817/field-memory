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
import { PageHeader, SectionLabel, Sparkline } from "@/components/common";
import { fmtDate, machineStatusStyle } from "@/lib/fmt";
import { cn } from "@/lib/utils";
import { ChevronRight, Search } from "lucide-react";

export default function Machines() {
  const machines = useQuery(api.machines.listMachines, {});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const types = useMemo(
    () => (machines ? [...new Set(machines.map((m) => m.type))].sort() : []),
    [machines],
  );

  const filtered = useMemo(() => {
    if (!machines) return [];
    const needle = q.trim().toLowerCase();
    return machines.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (type !== "all" && m.type !== type) return false;
      if (!needle) return true;
      return (
        m.name.toLowerCase().includes(needle) ||
        m.code.toLowerCase().includes(needle) ||
        m.type.toLowerCase().includes(needle) ||
        m.location.toLowerCase().includes(needle)
      );
    });
  }, [machines, q, status, type]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Machines"
        subtitle="All monitored assets with live telemetry and incident history."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, code, type or location…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {machines === undefined && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-border bg-card/40" />
          ))}
        </div>
      )}

      {machines && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center">
          <p className="text-sm font-medium">No machines match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clear the search or choose a different status/type.
          </p>
          <button
            className="mt-3 text-xs text-signal hover:underline"
            onClick={() => {
              setQ("");
              setStatus("all");
              setType("all");
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <Link
            key={m._id}
            to={`/machines/${m._id}`}
            className="group rounded-lg border border-border bg-card/60 p-4 transition-colors hover:border-signal/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-[15px] font-bold">{m.name}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {m.code} · {m.location}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                  machineStatusStyle[m.status],
                )}
              >
                {m.status.toUpperCase()}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 font-mono text-xs tabular-nums">
              <div>
                <SectionLabel>Temp</SectionLabel>
                <p className="mt-0.5 text-sm font-semibold">
                  {m.telemetry.temperature}
                  <span className="text-[10px] text-muted-foreground">°C</span>
                </p>
              </div>
              <div>
                <SectionLabel>Vibration</SectionLabel>
                <p className="mt-0.5 text-sm font-semibold">
                  {m.telemetry.vibration}
                  <span className="text-[10px] text-muted-foreground"> mm/s</span>
                </p>
              </div>
              <div>
                <SectionLabel>Pressure</SectionLabel>
                <p className="mt-0.5 text-sm font-semibold">
                  {m.telemetry.pressure}
                  <span className="text-[10px] text-muted-foreground"> bar</span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <Sparkline data={m.telemetryHistory.temperature} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {m.incidentCount} incidents
                  {m.openIncidents > 0 && (
                    <span className="ml-1 font-semibold text-red-400">{m.openIncidents} open</span>
                  )}
                </span>
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Last service {fmtDate(m.lastService)} · {m.operatingHours.toLocaleString()} h
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
