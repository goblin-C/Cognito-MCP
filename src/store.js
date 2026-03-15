
// In-memory store — resets on server restart (fine for a test project)
// Swap this out for a DB (e.g. Postgres via pg, or SQLite) when you want persistence

export const tasks = [];

export function findById(id) {
  return tasks.find(t => t.id === id);
}

export function removeById(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  return true;
}