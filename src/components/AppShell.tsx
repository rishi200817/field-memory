import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Activity,
  Bell,
  BrainCircuit,
  Building2,
  Cpu,
  GitBranch,
  Menu,
  Search,
  Settings,
  Waves,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/fmt";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV = [
  { to: "/overview", label: "Overview", icon: Activity },
  { to: "/machines", label: "Machines", icon: Cpu },
  { to: "/incidents", label: "Incidents", icon: Bell },
  { to: "/diagnostics", label: "Diagnostics", icon: Waves },
  { to: "/memory", label: "Memory", icon: BrainCircuit },
  { to: "/learning", label: "Learning", icon: GitBranch },
  { to: "/simulation", label: "Simulation", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/overview" className="flex items-center gap-2.5 px-1">
      <span className="fm-glow-signal flex size-8 items-center justify-center rounded-md border border-signal/30 bg-signal/10">
        <svg viewBox="0 0 24 24" className="size-4.5 text-signal" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3" strokeLinecap="round" />
          <path d="M4 14c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3" strokeLinecap="round" opacity="0.55" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-bold tracking-[0.14em] text-foreground">
          FIELDMEMORY
        </span>
      )}
    </Link>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border/70 px-4">
        <Logo />
      </div>
      <nav className="fm-scroll flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive &&
                  "bg-signal/10 text-signal shadow-[inset_2px_0_0_0] shadow-signal",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-border/70 p-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Hindsight
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            Connected
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex size-2">
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            System
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            Online
          </span>
        </div>
        <div className="flex items-center gap-3 border-t border-border/70 pt-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted font-display text-xs font-bold text-foreground">
            MT
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-foreground">Maintenance Team</p>
            <p className="font-mono text-[10px] text-muted-foreground">Hyderabad Plant</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = useQuery(api.search.globalSearch, { q: q.trim().length >= 1 ? q : "" });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };

  const empty =
    results &&
    results.machines.length === 0 &&
    results.incidents.length === 0 &&
    results.memories.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search machines, incidents, error codes…"
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="fm-scroll max-h-[50vh] overflow-y-auto p-2">
          {!results && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>
          )}
          {results && q.trim() && empty && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for “{q}”. Try a machine code (C-17), an error code (E204), or an incident ID.
            </p>
          )}
          {results && !q.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Search machines, incidents, memory IDs and error codes.
            </p>
          )}
          {results && results.machines.length > 0 && (
            <SearchGroup label="Machines">
              {results.machines.map((m) => (
                <button
                  key={m.id}
                  onClick={() => go(`/machines/${m.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{m.meta}</span>
                </button>
              ))}
            </SearchGroup>
          )}
          {results && results.incidents.length > 0 && (
            <SearchGroup label="Incidents">
              {results.incidents.map((i) => (
                <button
                  key={i.id}
                  onClick={() => go(`/incidents/${i.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-mono text-xs">{i.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{i.meta}</span>
                </button>
              ))}
            </SearchGroup>
          )}
          {results && results.memories.length > 0 && (
            <SearchGroup label="Memories">
              {results.memories.map((m) => (
                <button
                  key={m.id}
                  onClick={() => go(`/memory/${m.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-mono text-xs">{m.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{m.meta}</span>
                </button>
              ))}
            </SearchGroup>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const events = useQuery(api.learning.overviewFeed, { limit: 5 });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-signal" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-popover p-2 shadow-xl">
            <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Learning feed
            </p>
            {events === undefined && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
            )}
            {events?.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No learning events yet.</p>
            )}
            {events?.map((e) => (
              <Link
                key={e._id}
                to="/learning"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2 hover:bg-accent"
              >
                <p className="text-[13px] font-medium leading-tight">{e.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.detail}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {relativeTime(e.timestamp)}
                </p>
              </Link>
            ))}
            <div className="mt-1 border-t pt-1">
              <Link
                to="/learning"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-1.5 text-center text-xs text-signal hover:bg-accent"
              >
                View all learning events →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useMemo(() => window.location.pathname, []);
  const seedStatus = useQuery(api.bootstrap.seedStatus, {});
  const seedIfEmpty = useAction(api.bootstrap.seedIfEmpty);
  const seedAttempted = useRef(false);

  // Self-bootstrap: on first load of an empty deployment, seed demo data once.
  useEffect(() => {
    if (seedStatus && !seedStatus.seeded && !seedAttempted.current) {
      seedAttempted.current = true;
      seedIfEmpty({}).catch((err) =>
        console.warn("[FieldMemory] Seed failed:", err instanceof Error ? err.message : err),
      );
    }
  }, [seedStatus, seedIfEmpty]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  return (
    <div className="fm-grid-bg min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-border/70 bg-sidebar/60 backdrop-blur-sm">
            <SidebarInner />
          </aside>
        )}

        {/* Mobile drawer */}
        {isMobile && drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative z-10 h-full w-64 border-r border-border bg-sidebar">
              <button
                className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
              <SidebarInner onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur">
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-card/60 px-3 text-sm text-muted-foreground hover:border-signal/40"
            >
              <Search className="size-4" />
              <span className="truncate">Search machines, incidents, error codes…</span>
              <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:block">
                ⌘K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 md:flex">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Hyderabad Plant</span>
              </div>
              <NotificationsBell />
              <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card/60 px-2.5 py-1.5 sm:flex">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                  System online
                </span>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full bg-signal/15 font-display text-xs font-bold text-signal">
                MT
              </span>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </div>
  );
}
