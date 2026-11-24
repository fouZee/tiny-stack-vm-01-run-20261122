# Tiny Stack VM

A make.fun entry for **tiny-stack-vm-01-run-20261122**: a complete virtual
machine for make.fun's tiny stack ISA v1 — 32-bit wrapping integers, a
256-value stack, a 64-deep call stack, 256 words of memory, byte
input/output, all ten traps with their own exit codes, and the step and
output limits.

## Run

```sh
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

For each instance `<id>` it writes `<id>/stdout.bin` (the bytes the program
wrote) and `<id>/exit.txt` (its exit code, 0–255).
