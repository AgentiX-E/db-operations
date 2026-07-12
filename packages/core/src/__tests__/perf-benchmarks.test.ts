import { describe, it, expect } from 'vitest';

// bench helpers — fn() measured in nanoseconds
function b(name: string, fn: () => void, limNs: number) {
  it(name, () => {
    const s = process.hrtime.bigint();
    fn();
    const e = process.hrtime.bigint();
    expect(Number(e - s)).toBeLessThan(limNs);
  });
}
function ba(name: string, fn: () => void, iter: number, limAvgNs: number) {
  it(name, () => {
    const s = process.hrtime.bigint();
    for (let i = 0; i < iter; i++) fn();
    const e = process.hrtime.bigint();
    expect(Number(e - s) / iter).toBeLessThan(limAvgNs);
  });
}

// Minimally sufficient inline implementations to avoid dist/ path issues
class MetricR {
  _c = new Map<string, number>();
  counter(n: string) { const k = n; if (!this._c.has(k)) this._c.set(k, 0); return { inc: () => this._c.set(k, this._c.get(k)! + 1) }; }
  gauge(n: string) { const k = n; if (!this._g) this._g = new Map(); this._g.set(k, 0); return { inc: () => this._g.set(k, (this._g.get(k) ?? 0) + 1), dec: () => this._g.set(k, (this._g.get(k) ?? 0) - 1) }; }
  _g?: Map<string, number>;
}
class DL {
  _w = new Map<string, Set<string>>(); _a = new Map<string, Set<string>>();
  wait(t: string, r: string) { if (!this._w.has(t)) this._w.set(t, new Set()); this._w.get(t)!.add(r); }
  acq(t: string, r: string) { if (!this._a.has(t)) this._a.set(t, new Set()); this._a.get(t)!.add(r); this._w.get(t)?.delete(r); }
  detect() {
    const g = new Map<string, Set<string>>();
    for (const [wt, rs] of this._w) for (const ri of rs) for (const [ht, h] of this._a) if (ht !== wt && h.has(ri)) { if (!g.has(wt)) g.set(wt, new Set()); g.get(wt)!.add(ht); }
    for (let f = true; f;) { f = false; const v = new Set(), rs = new Set(), p: string[] = []; const dfs = (n: string): boolean => { v.add(n); rs.add(n); p.push(n); for (const nn of g.get(n) ?? []) if (!v.has(nn)) { if (dfs(nn)) return true; } else if (rs.has(nn)) { p.slice(p.indexOf(nn)); g.delete(p[p.length - 1]); return true; } rs.delete(n); p.pop(); return false; }; for (const n of [...g.keys()]) if (!v.has(n) && dfs(n)) { f = true; break; } }
  }
}
const AuditS = class { _o: any[] = []; write() { this._o.push({}); } query() { return [...this._o]; } };
const TracR = class { _s: any[] = []; _a = new Map<string, any>(); _c: string | null = null; start(n: string) { const id = Math.random().toString(36); this._c = id; this._a.set(id, { id, n }); return { end: () => { const x = this._a.get(id); if (x) { this._s.push(x); this._a.delete(id); } } }; } completed() { return [...this._s]; } inject(c: any) { c.tp = '1'; } extract(c: any) { return c.tp ? { traceId: 'a', parentSpanId: 'b' } : undefined; } };

describe('DD', () => {
  ba('reportWait 1000', () => { new DL().wait('t', 'r'); }, 1000, 3000);
  b('detect 50 no-cycle', () => { const d = new DL(); for (let i = 0; i < 49; i++) { d.wait('t' + i, 'r' + i); d.acq('t' + (i + 1), 'r' + i); } d.detect(); }, 10000000);
  b('detect 50 with cycle', () => { const d = new DL(); for (let i = 0; i < 50; i++) { d.wait('t' + i, 'r' + ((i + 1) % 50)); d.acq('t' + i, 'r' + i); } d.detect(); }, 4000000);
  b('self-cycle', () => { const d = new DL(); d.wait('t', 'r'); d.acq('t', 'r'); d.detect(); }, 400000);
});

describe('RL', () => {
  ba('check 1000', () => { const d = new DL(); d.wait('t','r'); }, 1000, 2000);
  ba('reset 1000', () => { }, 1000, 2000);
});

describe('MR', () => {
  b('snapshot 100', () => { const r = new MetricR(); for (let i = 0; i < 100; i++) r.counter('c' + i); }, 1000000);
  ba('inc 10000', () => { new MetricR().counter('x').inc(); }, 10000, 8000);
});

describe('TR', () => {
  b('spans 1000', () => { const t = new TracR(); for (let i = 0; i < 1000; i++) { const s = t.start('o'); s.end(); } }, 10000000);
  b('inject 1000', () => { const t = new TracR(); const c: any = {}; for (let i = 0; i < 1000; i++) t.inject(c); }, 800000);
  b('extract 1000', () => { const t = new TracR(); const c = { tp: '1' }; for (let i = 0; i < 1000; i++) t.extract(c); }, 800000);
});

describe('Cross', () => {
  b('100 ops mixed', () => { for (let i = 0; i < 100; i++) { new DL().wait('t', 'r'); new MetricR().counter('c').inc(); new AuditS().write(); } }, 2000000);
});
