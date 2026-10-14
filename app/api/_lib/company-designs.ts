const DESIGN_KEY = "monroe-glass-machine-designs-v1";

/** Remove designs unrelated to factory layout without altering anything else. */
export function sanitizeCompanyWorkspaceItem(key: string, value: string): string {
  if (key !== DESIGN_KEY) return value;
  try {
    const record = JSON.parse(value);
    if (!record || typeof record !== "object" || !record.designs || typeof record.designs !== "object") return value;
    const designs = Object.fromEntries(Object.entries(record.designs).filter(([id, design]) => {
      const machineType = String((design as {machineType?: unknown})?.machineType || "");
      return !/^combat-(weapon|zombie)-/i.test(id) && !/^(combatWeapon|combatZombie)$/i.test(machineType);
    }));
    return JSON.stringify({ ...record, designs });
  } catch {
    return value;
  }
}
