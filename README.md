[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/fouZee/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/fouZee/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# Tiny Stack VM

A complete virtual machine for make.fun's tiny stack ISA v1: 32-bit wrapping integers, a 256-value stack, a 64-deep call stack, 256 words of memory, byte I/O, all ten traps with their own exit codes, and the step and output limits. Entry for the [make.fun bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

## Run

```sh
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

For each instance `<id>` it writes `<id>/stdout.bin` and `<id>/exit.txt`.
