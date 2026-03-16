// ── Minimal JS-object → YAML serializer (no dependencies)
export function buildYaml(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (typeof value[0] === "object") {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          const itemLines = buildYaml(item, indent + 1).split("\n");
          itemLines[0] = `${"  ".repeat(indent)}- ${itemLines[0].trimStart()}`;
          lines.push(...itemLines);
        }
      } else {
        lines.push(`${pad}${key}:`);
        for (const item of value) lines.push(`${pad}- ${item}`);
      }
    } else if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      lines.push(buildYaml(value, indent + 1));
    } else if (typeof value === "string" && (value.includes(":") || value.includes("#") || value.includes("{"))) {
      lines.push(`${pad}${key}: '${value.replace(/'/g, "''")}'`);
    } else {
      lines.push(`${pad}${key}: ${value}`);
    }
  }

  return lines.join("\n");
}