# Mutation Test Results

> Time: 2026-08-09T08:22:19.398Z
> Files scanned: 2
> Mutants: 27 executed (+0 compile errors)
> Killed: 22 | Survived: 5
> **Score: 81.5%**
> Duration: 23s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🟡 health | 22 | 5 | 0 | **81.5%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_a115eb | health | Boolean | L47 | `true` → `false` |
| MUT_691580 | health | Arith/Logic | L157 | `/` → `*` |
| MUT_b1e5c7 | health | Arith/Logic | L178 | `||` → `&&` |
| MUT_5fdf82 | health | Arith/Logic | L189 | `||` → `&&` |
| MUT_261689 | health | Arith/Logic | L199 | `/` → `*` |