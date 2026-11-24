// Tiny Stack VM — make.fun entry for tiny-stack-vm-01-run-20261122.
// Runs every program in MAKEFUN_INPUT_DIR (default /input) under the tiny
// stack ISA v1 and writes /output/<id>/stdout.bin + /output/<id>/exit.txt.
// 32-bit wrapping ints, 256-value stack, 64-deep call stack, 256 words of
// memory, byte I/O, 1,000,000 steps, 65,536 output bytes. A trap ends the
// program at once with the trap's own exit code, keeping prior output.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// [opcode, immediate bytes, values popped, values pushed]
const SPEC = [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0], [4, 0, 1, 2],
  [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3], [16, 0, 2, 1], [17, 0, 2, 1],
  [18, 0, 2, 1], [19, 0, 2, 1], [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1],
  [23, 0, 1, 1], [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1],
  [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1], [32, 0, 2, 1], [33, 0, 2, 1],
  [34, 0, 2, 1], [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0],
  [52, 0, 0, 0], [64, 0, 1, 1], [65, 0, 2, 0], [80, 0, 1, 0], [81, 0, 1, 0],
  [82, 0, 0, 1], [83, 0, 1, 0],
];
const IMM = new Uint8Array(256), POPS = new Uint8Array(256);
const PUSH = new Uint8Array(256), KNOWN = new Uint8Array(256);
for (const [op, im, po, pu] of SPEC) { IMM[op] = im; POPS[op] = po; PUSH[op] = pu; KNOWN[op] = 1; }

const enc = new TextEncoder();

function run(p, inp) {
  const n = p.length, D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let csp = 0;
  const M = new Int32Array(256), out = new Uint8Array(65536);
  let olen = 0, ip = 0, pc = 0, steps = 0;
  const done = (code) => ({ out: out.subarray(0, olen), code });
  for (;;) {
    if (steps === 1000000) return done(10); // step limit
    if (pc < 0 || pc >= n) return done(9); // pc outside program
    const op = p[pc];
    if (!KNOWN[op]) return done(5); // unknown opcode
    const imm = IMM[op];
    if (pc + imm >= n) return done(9); // immediate cut off
    steps++;
    const nx = pc + 1 + imm, pops = POPS[op];
    if (sp < pops) return done(2); // stack underflow
    if (sp - pops + PUSH[op] > 256) return done(3); // stack overflow
    pc = nx;
    switch (op) {
      case 0x00: return done(0); // HALT
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 0x02: // PUSH32, little-endian
        D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03: sp--; break; // POP
      case 0x04: D[sp] = D[sp - 1]; sp++; break; // DUP
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; } // SWAP
      case 0x06: D[sp] = D[sp - 2]; sp++; break; // OVER
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; } // ROT
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break; // NEG
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break; // NOT
      case 0x30: case 0x31: case 0x32: { // JMP / JZ / JNZ
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = op === 0x30;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33: // CALL
        if (csp === 64) return done(7);
        C[csp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34: // RET
        if (csp === 0) return done(8);
        pc = C[--csp];
        break;
      case 0x40: { // LOAD
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 0x41: { // STORE: ( v addr -- )
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 0x50: { // PRINT: decimal ASCII, no newline
        const b = enc.encode(String(D[sp - 1]));
        if (olen + b.length > 65536) return done(11);
        sp--; out.set(b, olen); olen += b.length;
        break;
      }
      case 0x51: // PUTC: low byte
        if (olen + 1 > 65536) return done(11);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break; // IN
      case 0x53: return done(D[--sp] & 255); // EXIT: low byte
      default: { // two-operand arithmetic / logic / compare
        const b = D[sp - 1], a = D[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0; // ADD, wraps
        else if (op === 0x11) r = (a - b) | 0; // SUB, wraps
        else if (op === 0x12) r = Math.imul(a, b); // MUL, low 32 bits exactly
        else if (op === 0x13) { // DIV, truncated toward zero
          if (b === 0) return done(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) { // MOD, sign of a
          if (b === 0) return done(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) { // DIVU, unsigned
          if (b === 0) return done(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) { // MODU, unsigned
          if (b === 0) return done(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31); // SHL
        else if (op === 0x1d) r = a >> (b & 31); // SHR, arithmetic
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0; // SHRU, logical
        else if (op === 0x20) r = a === b ? 1 : 0; // EQ
        else if (op === 0x21) r = a < b ? 1 : 0; // LT, signed
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU, unsigned
        sp -= 2; D[sp++] = r;
        break;
      }
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const pp = join(I, id, 'program.bin');
  if (!existsSync(pp)) continue;
  const prog = new Uint8Array(readFileSync(pp));
  const ip = join(I, id, 'input.bin');
  const inp = existsSync(ip) ? new Uint8Array(readFileSync(ip)) : new Uint8Array(0);
  let res;
  try { res = run(prog, inp); } catch { res = { out: new Uint8Array(0), code: 1 }; }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), res.out);
  writeFileSync(join(O, id, 'exit.txt'), `${res.code}\n`);
}
