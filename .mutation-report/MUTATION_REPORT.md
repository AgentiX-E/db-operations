# Mutation Test Results

> Time: 2026-08-08T15:13:18.899Z
> Files scanned: 2
> Mutants: 27 executed (+0 compile errors)
> Killed: 20 | Survived: 7
> **Score: 74.1%**
> Duration: 23s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🔴 health | 20 | 7 | 0 | **74.1%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_a115eb | health | Boolean | L47 | `true` → `false` |
| MUT_98c6b7 | health | Arith/Logic | L162 | `/` → `*` |
| MUT_b1e5c7 | health | Arith/Logic | L178 | `||` → `&&` |
| MUT_aa07db | health | Arith/Logic | L190 | `||` → `&&` |
| MUT_f2e398 | health | Arith/Logic | L202 | `/` → `*` |
| MUT_5ebedc | health | Arith/Logic | L212 | `-` → `+` |
| MUT_65a51e | health | Boolean | L235 | `false` → `true` |