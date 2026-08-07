# Mutation Test Results

> Time: 2026-08-07T11:02:24.991Z
> Files scanned: 3
> Mutants: 9 executed (+0 compile errors)
> Killed: 8 | Survived: 1
> **Score: 88.9%**
> Duration: 40s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🟡 observability | 8 | 1 | 0 | **88.9%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_081adc | observability | Arith/Logic | L87 | `<` → `>=` |