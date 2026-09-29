// Deterministic code generation for memories and incidents.

/** "MEM-C17-E204-0926" style code from machine, error code and a timestamp. */
export function memoryCodeFor(machineCode: string, errorCode: string, iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `MEM-${machineCode}-${errorCode}-${mm}${yy}`;
}

/** "INC-C17-0126" style code from machine code and a timestamp (unique per ms). */
export function incidentCodeFor(machineCode: string, iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `INC-${machineCode}-${mm}${yy}-${d.getTime().toString(36).slice(-4).toUpperCase()}`;
}
