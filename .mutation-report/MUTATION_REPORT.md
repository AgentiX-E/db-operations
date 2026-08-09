# Mutation Test Results

> Time: 2026-08-09T00:37:40.466Z
> Files scanned: 5
> Mutants: 50 executed (+0 compile errors)
> Killed: 34 | Survived: 16
> **Score: 68.0%**
> Duration: 125s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🔴 backup | 34 | 16 | 0 | **68.0%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_742a4d | backup | Arith/Logic | L63 | `-` → `+` |
| MUT_6d5799 | backup | Arith/Logic | L80 | `&&` → `||` |
| MUT_fb93e3 | backup | Arith/Logic | L80 | `>` → `<=` |
| MUT_b40d91 | backup | Arith/Logic | L81 | `<` → `>=` |
| MUT_80c453 | backup | Arith/Logic | L82 | `+` → `-` |
| MUT_f7fbd5 | backup | Arith/Logic | L120 | `-` → `+` |
| MUT_c612c6 | backup | Arith/Logic | L78 | `&&` → `||` |
| MUT_368d06 | backup | Boolean | L18 | `true` → `false` |
| MUT_e7a2c6 | backup | Arith/Logic | L82 | `-` → `+` |
| MUT_08a745 | backup | Arith/Logic | L117 | `*` → `/` |
| MUT_a1a7df | backup | Arith/Logic | L130 | `+` → `-` |
| MUT_98821a | backup | Arith/Logic | L129 | `+` → `-` |
| MUT_ce19e2 | backup | Arith/Logic | L128 | `+` → `-` |
| MUT_b06e74 | backup | Arith/Logic | L129 | `*` → `/` |
| MUT_1511af | backup | Arith/Logic | L130 | `*` → `/` |
| MUT_a1fe40 | backup | Arith/Logic | L131 | `*` → `/` |