# Mutation Test Results

> Total mutants executed: 500
> Killed: 0 | Survived: 500 | Compile Error: 0
> **Mutation Score: 0.00%**

## Package Scores

| Package | Gen | Killed | Survived | Comp.Err | Score |
|---------|-----|--------|----------|----------|-------|
| 🔴 audit | 70 | 0 | 70 | 0 | **0.0%** |
| 🔴 autoscaler | 91 | 0 | 91 | 0 | **0.0%** |
| 🔴 autotuner | 30 | 0 | 30 | 0 | **0.0%** |
| 🔴 backup | 79 | 0 | 79 | 0 | **0.0%** |
| 🔴 chaosengine | 39 | 0 | 39 | 0 | **0.0%** |
| 🔴 circuitbreaker | 12 | 0 | 12 | 0 | **0.0%** |
| 🔴 configwatcher | 83 | 0 | 83 | 0 | **0.0%** |
| 🔴 federation | 96 | 0 | 96 | 0 | **0.0%** |

## Survivors (Test Gaps)

| ID | Package | Operator | Line | Original |
|----|---------|----------|------|----------|
| MUT_8e01b8 | audit | Arithmetic | 63 | `*` |
| MUT_8e01b8 | audit | Arithmetic | 63 | `*` |
| MUT_bb45ef | audit | Arithmetic | 64 | `*` |
| MUT_bb45ef | audit | Arithmetic | 64 | `*` |
| MUT_bb45ef | audit | Arithmetic | 64 | `*` |
| MUT_be47b1 | audit | Boolean | 97 | `true` |
| MUT_020a83 | audit | Arithmetic | 130 | `+` |
| MUT_de2f48 | audit | Logical | 144 | `>` |
| MUT_23246c | audit | Logical | 157 | `>=` |
| MUT_16a6c4 | audit | Boolean | 157 | `true` |
| MUT_2a2562 | autoscaler | Logical | 19 | `||` |
| MUT_2a2562 | autoscaler | Logical | 19 | `>` |
| MUT_2a2562 | autoscaler | Logical | 19 | `>=` |
| MUT_0c6711 | autoscaler | Logical | 22 | `||` |
| MUT_0c6711 | autoscaler | Arithmetic | 22 | `*` |
| MUT_0c6711 | autoscaler | Arithmetic | 22 | `+` |
| MUT_187543 | autoscaler | Arithmetic | 23 | `*` |
| MUT_187543 | autoscaler | Arithmetic | 23 | `*` |
| MUT_d957a7 | autoscaler | Logical | 28 | `<` |
| MUT_4e9dcb | autoscaler | Arithmetic | 32 | `*` |
| MUT_d42187 | autotuner | Logical | 86 | `===` |
| MUT_531afe | autotuner | Arithmetic | 90 | `+` |
| MUT_531afe | autotuner | Arithmetic | 90 | `*` |
| MUT_531afe | autotuner | Arithmetic | 90 | `*` |
| MUT_531afe | autotuner | Arithmetic | 90 | `-` |
| MUT_e37733 | autotuner | Arithmetic | 91 | `+` |
| MUT_e37733 | autotuner | Arithmetic | 91 | `*` |
| MUT_e37733 | autotuner | Arithmetic | 91 | `*` |
| MUT_e37733 | autotuner | Arithmetic | 91 | `-` |
| MUT_b6f026 | autotuner | Arithmetic | 92 | `+` |
| MUT_736f93 | backup | Arithmetic | 63 | `-` |
| MUT_605b4f | backup | Arithmetic | 65 | `*` |
| MUT_1e791a | backup | Arithmetic | 66 | `/` |
| MUT_cb592f | backup | Boolean | 68 | `true` |
| MUT_85297e | backup | Logical | 73 | `!==` |
| MUT_04c128 | backup | Boolean | 74 | `false` |
| MUT_2582da | backup | Logical | 80 | `&&` |
| MUT_2582da | backup | Logical | 80 | `>` |
| MUT_331da7 | backup | Logical | 81 | `<` |
| MUT_5bd5bf | backup | Arithmetic | 82 | `+` |
| MUT_394de9 | chaosengine | Arithmetic | 44 | `+` |
| MUT_cdd04a | chaosengine | Arithmetic | 46 | `+` |
| MUT_a85186 | chaosengine | Arithmetic | 47 | `/` |
| MUT_5ebf3b | chaosengine | Arithmetic | 51 | `*` |
| MUT_828382 | chaosengine | Arithmetic | 61 | `-` |
| MUT_828382 | chaosengine | Logical | 61 | `>` |
| MUT_d77d7e | chaosengine | Arithmetic | 62 | `*` |
| MUT_d77d7e | chaosengine | Arithmetic | 62 | `+` |
| MUT_1a765c | chaosengine | Boolean | 82 | `false` |
| MUT_5fe8c6 | chaosengine | Boolean | 102 | `true` |
| MUT_efbcc5 | circuitbreaker | Logical | 25 | `&&` |
| MUT_9ba6c5 | circuitbreaker | Logical | 24 | `&&` |
| MUT_2670a0 | circuitbreaker | Logical | 23 | `===` |
| MUT_9ba6c5 | circuitbreaker | Logical | 24 | `>` |
| MUT_efbcc5 | circuitbreaker | Logical | 25 | `>=` |
| MUT_efbcc5 | circuitbreaker | Arithmetic | 25 | `-` |
| MUT_95cb2b | circuitbreaker | Logical | 36 | `===` |
| MUT_10bce6 | circuitbreaker | Logical | 43 | `===` |
| MUT_b65193 | circuitbreaker | Logical | 55 | `===` |
| MUT_b7055a | circuitbreaker | Logical | 58 | `===` |
| MUT_10333f | configwatcher | Logical | 386 | `===` |
| MUT_5269f2 | configwatcher | Logical | 222 | `===` |
| MUT_9d00ae | configwatcher | Logical | 126 | `>` |
| MUT_06fc20 | configwatcher | Logical | 48 | `===` |
| MUT_69526d | configwatcher | Logical | 220 | `===` |
| MUT_af4490 | configwatcher | Negation | 224 | `!Array.isArray(newVal)` |
| MUT_8e5665 | configwatcher | Logical | 116 | `||` |
| MUT_adfe30 | configwatcher | Logical | 197 | `<` |
| MUT_9c10f1 | configwatcher | Logical | 224 | `&&` |
| MUT_336b06 | configwatcher | Negation | 164 | `!re.test(value)` |
| MUT_fee924 | federation | Logical | 574 | `===` |
| MUT_c60cc3 | federation | Logical | 202 | `===` |
| MUT_a8e0b0 | federation | Arithmetic | 246 | `/` |
| MUT_16b6b1 | federation | Logical | 452 | `||` |
| MUT_5d5cc9 | federation | Logical | 370 | `||` |
| MUT_61b2f2 | federation | Arithmetic | 367 | `-` |
| MUT_5a8d1f | federation | Logical | 470 | `===` |
| MUT_07bd77 | federation | Arithmetic | 148 | `*` |
| MUT_979079 | federation | Logical | 271 | `===` |
| MUT_d9bf0d | federation | Logical | 140 | `||` |