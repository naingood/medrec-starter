// Builder pattern untuk menyusun modul + add-on
class ModuleBuilder {
  constructor(slug) {
    this.module = { slug: slug, screens: {}, functions: {}, addons: [] };
  }
  screen(name, fn) {
    this.module.screens[name] = fn;
    if (!this.module.render) this.module.render = fn;
    return this;
  }
  fn(name, fn) {
    this.module.functions[name] = fn;
    return this;
  }
  addon(name, fn) {
    this.module.addons.push(name);
    try { fn(this.module); } catch (e) { console.error('[addon]', name, e && e.message); }
    return this;
  }
  build() {
    return this.module;
  }
}
window.ModuleBuilder = ModuleBuilder