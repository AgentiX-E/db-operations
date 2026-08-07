# Mutation Test Results

> Time: 2026-08-07T11:57:16.867Z
> Files scanned: 2
> Mutants: 37 executed (+0 compile errors)
> Killed: 11 | Survived: 26
> **Score: 29.7%**
> Duration: 255s

## Package Scores

| Package | Killed | Survived | CE | Score |
|---------|--------|----------|-----|-------|
| 🔴 chaosengine | 11 | 26 | 0 | **29.7%** |

## Survivors (Test Gaps)

| ID | Pkg | Op | Line | Original→Replacement |
|----|-----|----|------|----------------------|
| MUT_a6100f | chaosengine | Arith/Logic | L44 | `+` → `-` |
| MUT_29da68 | chaosengine | Arith/Logic | L46 | `+` → `-` |
| MUT_ad1855 | chaosengine | Arith/Logic | L51 | `*` → `/` |
| MUT_d06c01 | chaosengine | Arith/Logic | L61 | `>` → `<=` |
| MUT_7ae2b9 | chaosengine | Arith/Logic | L62 | `*` → `/` |
| MUT_5c6a8e | chaosengine | Arith/Logic | L62 | `+` → `-` |
| MUT_867afc | chaosengine | Boolean | L102 | `true` → `false` |
| MUT_8196e4 | chaosengine | Boolean | L110 | `false` → `true` |
| MUT_3b77ee | chaosengine | Arith/Logic | L128 | `>` → `<=` |
| MUT_daa505 | chaosengine | Arith/Logic | L223 | `+` → `-` |
| MUT_ceff82 | chaosengine | Arith/Logic | L229 | `+` → `-` |
| MUT_27af22 | chaosengine | Arith/Logic | L234 | `>` → `<=` |
| MUT_c25af8 | chaosengine | Arith/Logic | L239 | `&&` → `||` |
| MUT_f52cbd | chaosengine | Arith/Logic | L244 | `+` → `-` |
| MUT_6a2ead | chaosengine | Arith/Logic | L251 | `-` → `+` |
| MUT_b028b5 | chaosengine | Arith/Logic | L259 | `&&` → `||` |
| MUT_ea2c3a | chaosengine | Arith/Logic | L265 | `-` → `+` |
| MUT_d3fc01 | chaosengine | Arith/Logic | L290 | `!==` → `===` |
| MUT_8104f7 | chaosengine | Arith/Logic | L297 | `===` → `!==` |
| MUT_01d85d | chaosengine | Arith/Logic | L304 | `!==` → `===` |
| MUT_bc3430 | chaosengine | Arith/Logic | L325 | `!==` → `===` |
| MUT_6f06c5 | chaosengine | Arith/Logic | L390 | `<` → `>=` |
| MUT_50cf20 | chaosengine | Arith/Logic | L390 | `-` → `+` |
| MUT_167b53 | chaosengine | Arith/Logic | L435 | `||` → `&&` |
| MUT_e48e13 | chaosengine | Arith/Logic | L435 | `===` → `!==` |
| MUT_e48e13 | chaosengine | Arith/Logic | L435 | `===` → `!==` |