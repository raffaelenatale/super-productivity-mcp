type AllowlistMode = "open" | "restricted" | "closed";

function parseAllowlist(): { mode: AllowlistMode; allowed: Set<string> | null } {
  const raw = process.env.SP_MCP_ACTIONS_ALLOWLIST;
  if (raw === undefined) {
    return { mode: "open", allowed: null };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { mode: "closed", allowed: new Set() };
  }
  if (trimmed === "*") {
    return { mode: "open", allowed: null };
  }
  const allowed = new Set(
    trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (allowed.size === 0) {
    return { mode: "closed", allowed: new Set() };
  }
  return { mode: "restricted", allowed };
}

export function assertDispatchActionAllowed(action: string): void {
  const { mode, allowed } = parseAllowlist();
  if (mode === "open") return;
  if (mode === "closed") {
    throw new Error(
      "actions_dispatch is disabled: SP_MCP_ACTIONS_ALLOWLIST is set but empty. Set to * to allow any action, or a comma-separated list of action type strings.",
    );
  }
  if (!allowed!.has(action)) {
    const sample = [...allowed!].slice(0, 8).join(", ");
    throw new Error(
      `Action "${action}" is not allowed. Allowed actions (${allowed!.size}): ${sample}${allowed!.size > 8 ? ", …" : ""}. Configure SP_MCP_ACTIONS_ALLOWLIST.`,
    );
  }
}

export function describeActionsAllowlistEnv(): string {
  const { mode, allowed } = parseAllowlist();
  if (mode === "open" && allowed === null && process.env.SP_MCP_ACTIONS_ALLOWLIST === undefined) {
    return "SP_MCP_ACTIONS_ALLOWLIST not set — any action string is accepted. For production, set a comma-separated allowlist, * for any, or empty string to deny all.";
  }
  if (mode === "open") return "SP_MCP_ACTIONS_ALLOWLIST=* — any action allowed.";
  if (mode === "closed") return "SP_MCP_ACTIONS_ALLOWLIST is empty — all actions denied.";
  return `SP_MCP_ACTIONS_ALLOWLIST restricts to ${allowed!.size} action(s).`;
}
