// Simple WordPress-like hook system (actions + filters)
// Tracks owners so a plugin can be cleanly unregistered.

const actions = new Map(); // name -> [{ fn, owner }]
const filters = new Map(); // name -> [{ fn, owner }]

function addAction(name, fn, owner = null) {
  if (!actions.has(name)) actions.set(name, []);
  actions.get(name).push({ fn, owner });
}

function removeActionsByOwner(owner) {
  for (const [name, list] of actions) {
    actions.set(name, list.filter((x) => x.owner !== owner));
  }
}

function doAction(name, ...args) {
  const list = actions.get(name) || [];
  for (const { fn } of list) {
    try { fn(...args); } catch (e) { console.error('[hook:action]', name, e && e.message); }
  }
}

function addFilter(name, fn, owner = null) {
  if (!filters.has(name)) filters.set(name, []);
  filters.get(name).push({ fn, owner });
}

function removeFiltersByOwner(owner) {
  for (const [name, list] of filters) {
    filters.set(name, list.filter((x) => x.owner !== owner));
  }
}

function applyFilter(name, value, ...args) {
  const list = filters.get(name) || [];
  let current = value;
  for (const { fn } of list) {
    try { current = fn(current, ...args); } catch (e) { console.error('[hook:filter]', name, e && e.message); }
  }
  return current;
}

// Registry of events declared by modules (metadata for UI)
const moduleEvents = new Map(); // slug -> [{ name, description }]

function registerModuleEvents(slug, events) {
  if (!Array.isArray(events)) return;
  const list = events.map((e) => ({
    name: (e && e.name) ? String(e.name) : String(e),
    description: (e && e.description) ? String(e.description) : ''
  }));
  moduleEvents.set(slug, list);
}

function removeModuleEvents(slug) {
  moduleEvents.delete(slug);
}

function getModuleEvents() {
  const out = [];
  for (const [slug, events] of moduleEvents) {
    out.push({ slug, events });
  }
  return out;
}

function listActionNames() { return [...actions.keys()]; }
function listFilterNames() { return [...filters.keys()]; }

module.exports = {
  addAction, removeActionsByOwner, doAction,
  addFilter, removeFiltersByOwner, applyFilter,
  registerModuleEvents, removeModuleEvents, getModuleEvents,
  listActionNames, listFilterNames
};