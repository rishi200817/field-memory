import { Link } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fm-grid-bg flex min-h-screen flex-col bg-background"
    >
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-signal">
            Signal lost
          </p>
          <h1 className="mt-3 font-display text-6xl font-bold tracking-tight text-foreground">
            404
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This route is not part of the plant. The page you asked for does not exist or was
            decommissioned.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
              <Link to="/overview">Back to Command Center</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Home</Link>
            </Button>
          </div>
          <p className="mt-6 font-mono text-[11px] text-muted-foreground">
            Common routes: /overview · /machines · /incidents · /diagnostics · /memory
          </p>
        </div>
      </div>
    </motion.div>
  );
}
