#!/usr/bin/env npx tsx
/**
 * Standalone mutation test runner.
 *
 * Strategy:
 *   1. For each package, find its impl source files
 *   2. For each source file, generate mutants and run the package's test file
 *   3. If a mutant survives (tests still green), it's a test gap
 *   4. Report mutation score per package and aggregate
 *
 * Usage:
 *   npx tsx scripts/mutation-run.ts                    # all packages, full scan
 *   npx tsx scripts/mutation-run.ts --pkg=security     # single package
 *   npx tsx scripts/mutation-run.ts --max=20           # cap mutants per file
 *   npx tsx scripts/mutation-run.ts --killer           # re-run full suite on survivors
 *
 * This is NOT a test file — it's an analysis tool.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as ts from 'typescript';

const ROOT = resolve(__dirname, '..');
const REPORT_DIR = join(ROOT, '.mutation-report');

// CLI args
const args = process.argv.slice(2);
const targetPkg = args.find(a => a.startsWith('--pkg='))?.split('=')[1];
const maxMutants = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '60');
const killerPass = args.includes('--killer');

// ── Discovery ──────────────────────────────────────

function discoverFiles(pkgFilter?: string): string[] {
  const pkgDir = join(ROOT, 'packages');
  const files: string[] = [];
  for (const pkg of readdirSync(pkgDir)) {
    if (pkgFilter && pkg !== pkgFilter) continue;
    const implDir = join(pkgDir, pkg, 'src', 'impl');
    if (!existsSync(implDir)) continue;
    walk(implDir, (f) => {
      if (f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.includes('.test.') && !f.includes('.spec.')) {
        files.push(f);
      }
    });
  }
  return files;
}

function walk(dir: string, cb: (f: string) => void): void {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// ── Mutant Generation ──────────────────────────────

interface Mutant {
  id: string;
  operator: string;
  original: string;
  replacement: string;
  filePath: string;
  line: number;
  col: number;
}

function generateMutants(filePath: string, maxPerFile: number): Mutant[] {
  const source = readFileSync(filePath, 'utf-8');
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const mutants: Mutant[] = [];

  const pos = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const hash = (line: number, op: string) =>
    createHash('md5').update(`${relative(ROOT, filePath)}:${line}:${op}`).digest('hex').slice(0, 6);

  function visit(node: ts.Node): void {
    if (ts.isBinaryExpression(node)) {
      const swaps: Record<number, string> = {
        [ts.SyntaxKind.PlusToken]: '-', [ts.SyntaxKind.MinusToken]: '+',
        [ts.SyntaxKind.AsteriskToken]: '/', [ts.SyntaxKind.SlashToken]: '*',
        [ts.SyntaxKind.AmpersandAmpersandToken]: '||', [ts.SyntaxKind.BarBarToken]: '&&',
        [ts.SyntaxKind.EqualsEqualsEqualsToken]: '!==', [ts.SyntaxKind.ExclamationEqualsEqualsToken]: '===',
        [ts.SyntaxKind.GreaterThanToken]: '<=', [ts.SyntaxKind.LessThanToken]: '>=',
        [ts.SyntaxKind.GreaterThanEqualsToken]: '<', [ts.SyntaxKind.LessThanEqualsToken]: '>',
      };
      const r = swaps[node.operatorToken.kind];
      if (r) {
        const p = pos(node.operatorToken);
        mutants.push({
          id: `MUT_${hash(p.line, node.operatorToken.getText(sf))}`,
          operator: 'Arith/Logic',
          original: node.operatorToken.getText(sf),
          replacement: r,
          filePath, line: p.line + 1, col: p.character,
        });
      }
    }

    if (ts.isToken(node) && node.kind === ts.SyntaxKind.TrueKeyword) {
      const p = pos(node);
      mutants.push({ id: `MUT_${hash(p.line, 'true')}`, operator: 'Boolean', original: 'true', replacement: 'false', filePath, line: p.line + 1, col: p.character });
    }
    if (ts.isToken(node) && node.kind === ts.SyntaxKind.FalseKeyword) {
      const p = pos(node);
      mutants.push({ id: `MUT_${hash(p.line, 'false')}`, operator: 'Boolean', original: 'false', replacement: 'true', filePath, line: p.line + 1, col: p.character });
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  // Cap and sample
  return mutants.length > maxPerFile
    ? [...mutants].sort(() => Math.random() - 0.5).slice(0, maxPerFile)
    : mutants;
}

// ── Mutant Application ─────────────────────────────
// Uses sed (not writeFileSync) because Node.js file writes are not always
// visible to subsequent child_process execSync calls — Linux VFS/page cache
// sync issue with concurrent spawn calls.

function applyMutantInPlace(fp: string, m: Mutant): void {
  // Use sed to replace only the FIRST occurrence on the target line.
  // Use | as delimiter to avoid escaping slashes in JavaScript operators.
  const escapedOriginal = m.original.replace(/[\\|]/g, '\\$&');
  const escapedReplacement = m.replacement.replace(/[\\|]/g, '\\$&');
  execSync(
    `sed -i "${m.line}s|${escapedOriginal}|${escapedReplacement}|" "${fp}"`,
    { encoding: 'utf-8', timeout: 5_000, shell: '/bin/bash' }
  );
}

function restoreFile(fp: string, original: string): void {
  writeFileSync(fp, original);
}

// ── Package Name ───────────────────────────────────

function pkgOf(fp: string): string {
  return relative(ROOT, fp).split('/')[1] || 'unknown';
}

function findTest(pkg: string): string[] {
  const dir = join(ROOT, 'packages', pkg, 'src', '__tests__');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.test.ts') && !f.includes('e2e') && !f.includes('integration') &&
      !f.includes('mutation') && !f.includes('benchmark') && !f.includes('stress') &&
      !f.includes('fuzz') && !f.includes('chaos'))
    .map(f => join(dir, f));
}

// ── Test Runner ────────────────────────────────────

function runTests(testFiles: string[]): { killed: boolean; durationMs: number; error?: string } {
  if (testFiles.length === 0) return { killed: false, durationMs: 0 };

  const paths = testFiles.join(' ');
  const start = Date.now();

  try {
    execSync(`npx vitest run ${paths} 2>&1`, {
      cwd: ROOT, encoding: 'utf-8', timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0', NODE_OPTIONS: '--max-old-space-size=4096' },
      shell: '/bin/bash',
    });
    return { killed: false, durationMs: Date.now() - start };
  } catch (err: any) {
    const combined = ((err.stdout || '') + (err.stderr || '')).toLowerCase();
    // Vitest outputs failure info to stdout, not stderr
    if (combined.includes('fail') || combined.includes('assertionerror') ||
      combined.includes('expected ') || combined.includes('×')) {
      return { killed: true, durationMs: Date.now() - start };
    }
    return { killed: false, durationMs: Date.now() - start, error: combined.slice(0, 100) };
  }
}

// ── Main ───────────────────────────────────────────

async function main(): Promise<void> {
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });

  const files = discoverFiles(targetPkg);
  console.log(`\n🔬 Mutation Test Engine`);
  console.log(`   Source files: ${files.length}${targetPkg ? ` (pkg: ${targetPkg})` : ''}`);
  console.log(`   Max mutants/file: ${maxMutants}\n`);

  // Generate
  const allMutants: Mutant[] = [];
  for (const f of files) {
    const m = generateMutants(f, maxMutants);
    if (m.length > 0) console.log(`   ${relative(ROOT, f)}: ${m.length}`);
    allMutants.push(...m);
  }

  console.log(`\n   Total: ${allMutants.length} mutants\n`);
  console.log(`   Executing...\n`);

  // Execute
  const results = new Map<string, { killed: number; survived: number; compileErr: number; survivors: Mutant[] }>();
  let killed = 0, survived = 0, compileErr = 0;
  const startAll = Date.now();

  for (let i = 0; i < allMutants.length; i++) {
    const m = allMutants[i]!;
    const pkg = pkgOf(m.filePath);
    if (!results.has(pkg)) results.set(pkg, { killed: 0, survived: 0, compileErr: 0, survivors: [] });

    const originalSource = readFileSync(m.filePath, 'utf-8');

    try {
      applyMutantInPlace(m.filePath, m);
      const testFiles = killerPass ? [join(ROOT, 'packages')] : findTest(pkg);
      const { killed: isKilled, error } = runTests(testFiles);

      if (error?.includes('syntax') || error?.includes('unexpected') || error?.includes('parse')) {
        compileErr++;
        results.get(pkg)!.compileErr++;
      } else if (isKilled) {
        killed++;
        results.get(pkg)!.killed++;
      } else {
        survived++;
        results.get(pkg)!.survived++;
        results.get(pkg)!.survivors.push(m);
      }
    } finally {
      restoreFile(m.filePath, originalSource);
    }

    if ((i + 1) % 20 === 0 || i === allMutants.length - 1) {
      const pct = ((i + 1) / allMutants.length * 100).toFixed(0);
      process.stdout.write(`\r   [${i + 1}/${allMutants.length}] ${pct}% | K:${killed} S:${survived} CE:${compileErr}`);
    }
  }

  const totalTime = Date.now() - startAll;
  const executed = killed + survived;
  const score = executed > 0 ? (killed / executed * 100) : 100;

  console.log(`\n\n📊 Results (${(totalTime / 1000).toFixed(0)}s)`);
  console.log(`   Killed: ${killed} | Survived: ${survived} | Compile Error: ${compileErr}`);
  console.log(`   Mutation Score: ${score.toFixed(1)}%\n`);

  // Report
  const lines = [
    '# Mutation Test Results',
    '',
    `> Time: ${new Date().toISOString()}`,
    `> Files scanned: ${files.length}`,
    `> Mutants: ${executed} executed (+${compileErr} compile errors)`,
    `> Killed: ${killed} | Survived: ${survived}`,
    `> **Score: ${score.toFixed(1)}%**`,
    `> Duration: ${(totalTime / 1000).toFixed(0)}s`,
    '',
    '## Package Scores',
    '',
    '| Package | Killed | Survived | CE | Score |',
    '|---------|--------|----------|-----|-------|',
  ];

  for (const [p, s] of [...results.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ps = s.killed + s.survived;
    const pscore = ps > 0 ? (s.killed / ps * 100) : 100;
    const st = pscore >= 95 ? '🟢' : pscore >= 80 ? '🟡' : '🔴';
    lines.push(`| ${st} ${p} | ${s.killed} | ${s.survived} | ${s.compileErr} | **${pscore.toFixed(1)}%** |`);
  }

  if (survived > 0) {
    lines.push('', '## Survivors (Test Gaps)', '', '| ID | Pkg | Op | Line | Original→Replacement |', '|----|-----|----|------|----------------------|');
    for (const [p, s] of results) {
      for (const m of s.survivors) {
        lines.push(`| ${m.id} | ${p} | ${m.operator} | L${m.line} | \`${m.original}\` → \`${m.replacement}\` |`);
      }
    }
  }

  writeFileSync(join(REPORT_DIR, 'MUTATION_REPORT.md'), lines.join('\n'));
  console.log(`   Report: .mutation-report/MUTATION_REPORT.md\n`);

  if (score < 85) {
    console.log('⚠️  Mutation score below 85% — significant test gaps detected.\n');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
