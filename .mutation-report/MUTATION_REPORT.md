# Mutation Test Results

> Time: 2026-08-09T23:45:58.587Z
> Files scanned: 2
> Mutants: 27 executed (+0 compile errors)
> Killed: 24 | Survived: 3
> **Score: 88.9%**
> Duration: 22s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🟡 health | 24 | 3 | 0 | **88.9%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_a115eb | health | Boolean | L47 | `true` → `false` |
| MUT_691580 | health | Arith/Logic | L157 | `/` → `*` |
| MUT_261689 | health | Arith/Logic | L199 | `/` → `*` |