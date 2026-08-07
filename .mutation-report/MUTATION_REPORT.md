# Mutation Test Results

> Time: 2026-08-07T06:56:27.122Z
> Files scanned: 17
> Mutants: 59 executed (+0 compile errors)
> Killed: 42 | Survived: 17
> **Score: 71.2%**
> Duration: 564s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🔴 security | 42 | 17 | 0 | **71.2%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_937fbb | security | Arith/Logic | L89 | `+` → `-` |
| MUT_20c779 | security | Arith/Logic | L30 | `*` → `/` |
| MUT_07a552 | security | Arith/Logic | L29 | `!==` → `===` |
| MUT_3ea133 | security | Arith/Logic | L21 | `<` → `>=` |
| MUT_34a4ba | security | Arith/Logic | L34 | `<` → `>=` |
| MUT_491f1a | security | Arith/Logic | L14 | `*` → `/` |
| MUT_619b56 | security | Arith/Logic | L38 | `+` → `-` |
| MUT_abff7f | security | Arith/Logic | L14 | `-` → `+` |
| MUT_14311e | security | Arith/Logic | L38 | `*` → `/` |
| MUT_addb76 | security | Boolean | L108 | `true` → `false` |
| MUT_3b872c | security | Arith/Logic | L121 | `<=` → `>` |
| MUT_b0f08a | security | Boolean | L169 | `true` → `false` |
| MUT_c4646b | security | Boolean | L550 | `true` → `false` |
| MUT_597f72 | security | Arith/Logic | L193 | `&&` → `||` |
| MUT_461cb3 | security | Arith/Logic | L340 | `===` → `!==` |
| MUT_5f2821 | security | Boolean | L136 | `false` → `true` |
| MUT_f52ef8 | security | Arith/Logic | L226 | `*` → `/` |