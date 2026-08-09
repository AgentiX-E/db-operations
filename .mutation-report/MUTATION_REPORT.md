# Mutation Test Results

> Time: 2026-08-09T06:33:23.990Z
> Files scanned: 2
> Mutants: 21 executed (+0 compile errors)
> Killed: 18 | Survived: 3
> **Score: 85.7%**
> Duration: 18s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🟡 logger | 18 | 3 | 0 | **85.7%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_895a6e | logger | Arith/Logic | L143 | `&&` → `||` |
| MUT_895a6e | logger | Arith/Logic | L143 | `&&` → `||` |
| MUT_7de612 | logger | Arith/Logic | L156 | `&&` → `||` |