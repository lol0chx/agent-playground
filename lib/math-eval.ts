/**
 * Tiny safe expression evaluator.
 *
 * Recursive-descent parser + walking-tree evaluator. Pure JS, no Function/eval,
 * no dynamic code generation — safe to run on the edge runtime where mathjs
 * (and anything using `typed-function`) won't load.
 *
 * Supports:
 *   - integer + float numbers, scientific notation (e.g. 1.5e-3)
 *   - operators: + - * / % ^ (and **), with correct precedence
 *   - parentheses, unary minus
 *   - constants: pi, e
 *   - functions: sqrt abs floor ceil round sin cos tan log ln exp pow min max
 */

type TokenType =
  | 'NUMBER'
  | 'IDENT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'CARET'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < input.length && /[0-9.eE+\-]/.test(input[j]!)) {
        const ch = input[j]!;
        if ((ch === '+' || ch === '-') && j > i) {
          const prev = input[j - 1]!;
          if (prev !== 'e' && prev !== 'E') break;
        }
        j++;
      }
      const value = input.slice(i, j);
      if (Number.isNaN(Number(value))) {
        throw new Error(`Invalid number: ${value}`);
      }
      tokens.push({ type: 'NUMBER', value, pos: i });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_]/.test(input[j]!)) j++;
      tokens.push({
        type: 'IDENT',
        value: input.slice(i, j).toLowerCase(),
        pos: i,
      });
      i = j;
      continue;
    }
    if (c === '*' && input[i + 1] === '*') {
      tokens.push({ type: 'CARET', value: '**', pos: i });
      i += 2;
      continue;
    }
    const single: Record<string, TokenType> = {
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '%': 'PERCENT',
      '^': 'CARET',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ',': 'COMMA',
    };
    const kind = single[c];
    if (kind) {
      tokens.push({ type: kind, value: c, pos: i });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at position ${i}`);
  }
  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
};

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const v = this.expr();
    this.expect('EOF');
    return v;
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`Expected ${type} but got '${t.value}' at ${t.pos}`);
    }
    this.pos++;
    return t;
  }

  private expr(): number {
    let left = this.term();
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.peek().type;
      this.pos++;
      const right = this.term();
      left = op === 'PLUS' ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.power();
    while (
      this.peek().type === 'STAR' ||
      this.peek().type === 'SLASH' ||
      this.peek().type === 'PERCENT'
    ) {
      const op = this.peek().type;
      this.pos++;
      const right = this.power();
      if (op === 'STAR') left *= right;
      else if (op === 'SLASH') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else left %= right;
    }
    return left;
  }

  private power(): number {
    const base = this.unary();
    if (this.peek().type === 'CARET') {
      this.pos++;
      return Math.pow(base, this.power()); // right-associative
    }
    return base;
  }

  private unary(): number {
    if (this.peek().type === 'MINUS') {
      this.pos++;
      return -this.unary();
    }
    if (this.peek().type === 'PLUS') {
      this.pos++;
      return this.unary();
    }
    return this.atom();
  }

  private atom(): number {
    const t = this.peek();
    if (t.type === 'NUMBER') {
      this.pos++;
      return Number(t.value);
    }
    if (t.type === 'LPAREN') {
      this.pos++;
      const v = this.expr();
      this.expect('RPAREN');
      return v;
    }
    if (t.type === 'IDENT') {
      this.pos++;
      if (this.peek().type === 'LPAREN') {
        this.pos++;
        const args: number[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.expr());
          while (this.peek().type === 'COMMA') {
            this.pos++;
            args.push(this.expr());
          }
        }
        this.expect('RPAREN');
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new Error(`Unknown function: ${t.value}`);
        return fn(...args);
      }
      const c = CONSTANTS[t.value];
      if (c !== undefined) return c;
      throw new Error(`Unknown identifier: ${t.value}`);
    }
    throw new Error(`Unexpected token '${t.value}' at ${t.pos}`);
  }
}

export function safeEvaluate(expression: string): number {
  const result = new Parser(tokenize(expression)).parse();
  if (!Number.isFinite(result)) {
    throw new Error('Result is not a finite number');
  }
  return result;
}
