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
| MUT_187543 | autoscaler | Arithmetic | 23 | `/` |
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
| MUT_b1c986 | configwatcher | Logical | 50 | `!==` |
| MUT_06fc20 | configwatcher | Logical | 48 | `===` |
| MUT_81a1f9 | configwatcher | Negation | 485 | `!vr.valid` |
| MUT_317922 | configwatcher | Logical | 178 | `&&` |
| MUT_78f896 | configwatcher | Negation | 130 | `!field.enum.includes(value)` |
| MUT_336b06 | configwatcher | Negation | 164 | `!re.test(value)` |
| MUT_5bf694 | configwatcher | Logical | 76 | `!==` |
| MUT_06fc20 | configwatcher | Logical | 48 | `||` |
| MUT_750312 | configwatcher | Logical | 182 | `&&` |
| MUT_9770a6 | configwatcher | Logical | 142 | `!==` |
| MUT_101964 | federation | Arithmetic | 177 | `-` |
| MUT_99d6e3 | federation | Logical | 240 | `===` |
| MUT_db90e0 | federation | Negation | 123 | `!r.success` |
| MUT_ebec02 | federation | Logical | 508 | `&&` |
| MUT_61c6aa | federation | Logical | 382 | `||` |
| MUT_4b9054 | federation | Logical | 356 | `||` |
| MUT_f012a8 | federation | Negation | 356 | `!targetShards` |
| MUT_07bd77 | federation | Arithmetic | 148 | `*` |
| MUT_a8e0b0 | federation | Arithmetic | 246 | `/` |
| MUT_a88990 | federation | Logical | 233 | `||` |