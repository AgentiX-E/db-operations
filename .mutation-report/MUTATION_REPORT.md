# Mutation Test Results

> Time: 2026-08-09T12:37:13.589Z
> Files scanned: 2
> Mutants: 21 executed (+0 compile errors)
> Killed: 20 | Survived: 1
> **Score: 95.2%**
> Duration: 18s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🟢 logger | 20 | 1 | 0 | **95.2%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_314749 | logger | Boolean | L143 | `false` → `true` |