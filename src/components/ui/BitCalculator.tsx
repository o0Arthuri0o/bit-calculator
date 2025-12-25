import { useState, type ReactNode } from "react";

import {
  add as armAdd,
  adc as armAdc,
  sub as armSub,
  sbc as armSbc,
  rsb as armRsb,
  rsc as armRsc,
  cmp as armCmp,
} from "../../lib/armArithmetic";

import { Button } from "./button";
import { Input } from "./input";
import "../../BitCalculator.css";

type InputBase = "dec" | "bin";
type TabKey = "logical" | "shifts" | "arithmetic" | "history";

type Flags = {
  N: number;
  Z: number;
  C?: number;
  V?: number;
};

type HistoryItem = {
  time: string;
  op: string;
  input: string;
  res: number;
  flags?: Flags;
};


const toHex32 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
const toBin32 = (n: number) => (n >>> 0).toString(2).padStart(32, "0");
const toBin8 = (n: number) => ((n >>> 0) & 0xff).toString(2).padStart(8, "0");
const formatBinary = (n: number) => toBin32(n).replace(/(.{4})/g, "$1 ").trim();
const clampInt32 = (n: number) => (n | 0);

const Bit = ({ value }: { value: string }) => (
  <div className={`bit-calculator-bit ${value === "1" ? "one" : "zero"}`}>
    {value}
  </div>
);

const BitRow = ({ value }: { value: number }) => (
  <div className="bit-calculator-bit-row">
    {toBin8(value)
      .split("")
      .map((b, i) => (
        <Bit key={i} value={b} />
      ))}
  </div>
);

const BitLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="bit-calculator-bit-label">{children}</div>
);

const Operator = ({ children }: { children: React.ReactNode }) => (
  <div className="bit-calculator-operator-symbol">{children}</div>
);

const LogicalVisualization = ({
  a,
  b,
  result,
  op,
  unary,
}: {
  a: number;
  b: number;
  result: number;
  op: string;
  unary?: boolean;
}) => (
  <div>
    <BitLabel>r0 (A) = {a}</BitLabel>
    <BitRow value={a} />

    <Operator>{op}</Operator>

    {!unary && (
      <>
        <BitLabel>r1 (B) = {b}</BitLabel>
        <BitRow value={b} />
      </>
    )}

    <Operator>══════</Operator>

    <BitLabel>r2 = {result}</BitLabel>
    <BitRow value={result} />
  </div>
);

const ShiftVisualization = ({
  original,
  result,
  amount,
  type,
  carry,
}: {
  original: number;
  result: number;
  amount: number;
  type: "lsl" | "lsr" | "asr" | "ror";
  carry: number;
}) => {
  const arrows: Record<typeof type, string> = {
    lsl: "←",
    lsr: "→",
    asr: "→",
    ror: "↻",
  };

  const descriptions: Record<typeof type, string> = {
    lsl: `Справа входят ${amount} нулей`,
    lsr: `Слева входят ${amount} нулей`,
    asr: "Слева копируется бит знака",
    ror: "Биты возвращаются по кругу",
  };

  return (
    <div>
      <BitLabel>Исходное число (r0) = {original}</BitLabel>
      <BitRow value={original} />

      <div className="bit-calculator-shift-arrow">
        {Array.from({ length: amount }).map((_, idx) => (
          <span key={idx} style={{ padding: "0 4px" }}>
            {arrows[type]}
          </span>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>{descriptions[type]}</div>

      <Operator>══════</Operator>

      <BitLabel>Результат (r1) = {result}</BitLabel>
      <BitRow value={result} />

      <div className="bit-calculator-carry-flag-box">
        <strong>Флаг переноса C = {carry}</strong>
      </div>
    </div>
  );
};

const ArithmeticVisualization = ({
  a,
  b,
  result,
  flags,
  op,
}: {
  a: number;
  b: number;
  result: number;
  flags: Flags;
  op: string;
}) => (
  <div>
    <BitLabel>r0 (A) = {a}</BitLabel>
    <BitRow value={a} />

    <Operator>{op}</Operator>

    <BitLabel>r1 (B) = {b}</BitLabel>
    <BitRow value={b} />

    <Operator>══════</Operator>

    <BitLabel>Результат = {result}</BitLabel>
    <BitRow value={result} />

    <div className="bit-calculator-flags-grid">
      {(["N", "Z"] as const).map((flag) => (
        <div
          key={flag}
          className={`bit-calculator-flag-item ${
            flags[flag as keyof Flags] ? "active" : "inactive"
          }`}
        >
          {flag} = {flags[flag as keyof Flags] ?? "—"}
        </div>
      ))}
    </div>
  </div>
);

const tabsName: Record<TabKey, string> = {
  logical: "Логические",
  shifts: "Сдвиги",
  arithmetic: "Арифметика",
  history: "История",
};

export default function BitCalculator() {
  const [tab, setTab] = useState<TabKey>("logical");
  const [inputBase, setInputBase] = useState<InputBase>("dec");
  const [carryFlag, setCarryFlag] = useState(0);

  const [a, setA] = useState<number>(5);
  const [b, setB] = useState<number>(7);
  const [shift, setShift] = useState<number>(1);

  const [aInput, setAInput] = useState("5");
  const [bInput, setBInput] = useState("7");
  const [shiftInput, setShiftInput] = useState("1");

  const [errors, setErrors] = useState<{ a?: string; b?: string; shift?: string }>({});

  const [result, setResult] = useState<number | null>(null);
  const [vis, setVis] = useState<ReactNode>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFlags, setLastFlags] = useState<Flags | null>(null);

  const addHistory = (entry: HistoryItem) =>
    setHistory((prev) => [entry, ...prev].slice(0, 40));

  const syncInputValue = (value: number, target: "a" | "b") => {
    const formatted = inputBase === "dec" ? String(value) : (value >>> 0).toString(2);
    if (target === "a") setAInput(formatted);
    if (target === "b") setBInput(formatted);
  };

  const parseByBase = (value: string, base: InputBase) => {
    if (base === "dec") {
      if (value.trim() === "") return { ok: false, num: 0 };
      const num = Number(value);
      return Number.isFinite(num) ? { ok: true, num: clampInt32(num) } : { ok: false, num: 0 };
    }

    const clean = value.replace(/\s+/g, "");
    if (!/^[01]*$/.test(clean)) return { ok: false, num: 0 };
    const parsed = clean === "" ? 0 : parseInt(clean, 2);
    return { ok: true, num: clampInt32(parsed) };
  };

  const handleBaseChange = (next: InputBase) => {
    setInputBase(next);
    syncInputValue(a, "a");
    syncInputValue(b, "b");
  };

  const handleNumberChange = (raw: string, target: "a" | "b") => {
    if (target === "a") setAInput(raw);
    if (target === "b") setBInput(raw);
    const parsed = parseByBase(raw, inputBase);

    setErrors((prev) => ({ ...prev, [target]: parsed.ok ? undefined : "Неверный формат" }));
    if (!parsed.ok) return;

    if (target === "a") setA(parsed.num);
    if (target === "b") setB(parsed.num);
  };

  const handleShiftChange = (raw: string) => {
    setShiftInput(raw);
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      setErrors((prev) => ({ ...prev, shift: "Введите число" }));
      return;
    }
    const clamped = Math.max(0, Math.min(31, Math.trunc(num)));
    setErrors((prev) => ({ ...prev, shift: undefined }));
    setShift(clamped);
    setShiftInput(String(clamped));
  };

  const logical = (type: "and" | "orr" | "eor" | "bic" | "mvn") => {
    let r = 0;
    let op = "";
    let unary = false;

    switch (type) {
      case "and":
        r = a & b;
        op = "AND";
        break;
      case "orr":
        r = a | b;
        op = "OR";
        break;
      case "eor":
        r = a ^ b;
        op = "XOR";
        break;
      case "bic":
        r = a & ~b;
        op = "BIC";
        break;
      case "mvn":
        r = ~a;
        op = "NOT";
        unary = true;
        break;
    }

    r = clampInt32(r);
    const flags: Flags = { N: r < 0 ? 1 : 0, Z: r === 0 ? 1 : 0 };
    setLastFlags(flags);
    setResult(r);
    setA(r);
    syncInputValue(r, "a");
    setVis(<LogicalVisualization a={a} b={b} result={r} op={op} unary={unary} />);
    addHistory({
      time: new Date().toLocaleTimeString("ru-RU"),
      op,
      input: unary ? `r0=${a}` : `r0=${a}, r1=${b}`,
      res: r,
      flags,
    });
  };

  const shiftOp = (type: "lsl" | "lsr" | "asr" | "ror") => {
    const amount = shift;
    if (amount === 0) {
      const flags: Flags = { N: a < 0 ? 1 : 0, Z: a === 0 ? 1 : 0, C: carryFlag };
      setLastFlags(flags);
      setVis(
        <ShiftVisualization original={a} result={a} amount={0} type={type} carry={carryFlag} />
      );
      setResult(a);
      addHistory({
        time: new Date().toLocaleTimeString("ru-RU"),
        op: type.toUpperCase(),
        input: `r0=${a}, shift=0`,
        res: a,
        flags,
      });
      return;
    }

    let r = 0;
    let carry = 0;
    if (type === "lsl") {
      carry = (a >>> (32 - amount)) & 1;
      r = a << amount;
    }
    if (type === "lsr") {
      carry = (a >>> (amount - 1)) & 1;
      r = a >>> amount;
    }
    if (type === "asr") {
      carry = (a >>> (amount - 1)) & 1;
      r = a >> amount;
    }
    if (type === "ror") {
      const rot = amount % 32;
      carry = (a >>> (rot - 1)) & 1;
      r = (a >>> rot) | (a << (32 - rot));
    }

    r = clampInt32(r);
    const flags: Flags = { N: r < 0 ? 1 : 0, Z: r === 0 ? 1 : 0, C: carry };
    setCarryFlag(carry);
    setLastFlags(flags);
    setResult(r);
    setA(r);
    syncInputValue(r, "a");
    setVis(
      <ShiftVisualization
        original={a}
        result={r}
        amount={amount}
        type={type}
        carry={carry}
      />
    );
    addHistory({
      time: new Date().toLocaleTimeString("ru-RU"),
      op: type.toUpperCase(),
      input: `r0=${a}, shift=${amount}`,
      res: r,
      flags,
    });
  };

  const arithmetic = (
    type: "add" | "sub" | "rsb" | "mul" | "adc" | "sbc" | "rsc" | "cmp"
  ) => {
    let r = 0;
    let flags: Flags = { N: 0, Z: 0 };

    switch (type) {
      case "add": {
        const { result, flags: armFlags } = armAdd(a, b);
        r = result;
        flags = armFlags;
        break;
      }
      case "adc": {
        const { result, flags: armFlags } = armAdc(a, b, carryFlag);
        r = result;
        flags = armFlags;
        break;
      }
      case "sub": {
        const { result, flags: armFlags } = armSub(a, b);
        r = result;
        flags = armFlags;
        break;
      }
      case "sbc": {
        const { result, flags: armFlags } = armSbc(a, b, carryFlag);
        r = result;
        flags = armFlags;
        break;
      }
      case "rsb": {
        const { result, flags: armFlags } = armRsb(a, b);
        r = result;
        flags = armFlags;
        break;
      }
      case "rsc": {
        const { result, flags: armFlags } = armRsc(a, b, carryFlag);
        r = result;
        flags = armFlags;
        break;
      }
      case "mul": {
        const product = BigInt(a) * BigInt(b);
        r = clampInt32(Number(product & 0xffffffffn));
        const overflow = product > 0x7fffffffn || product < -0x80000000n ? 1 : 0;
        flags = { N: r < 0 ? 1 : 0, Z: r === 0 ? 1 : 0, V: overflow };
        break;
      }
      case "cmp": {
        const { result, flags: armFlags } = armCmp(a, b);
        r = result;
        flags = armFlags;
        break;
      }
    }

    setLastFlags(flags);
    if (flags.C !== undefined) setCarryFlag(flags.C);

    setResult(r);
    if (type !== "cmp") {
      setA(r);
      syncInputValue(r, "a");
    }

    setVis(
      <ArithmeticVisualization
        a={a}
        b={b}
        result={r}
        flags={flags}
        op={type.toUpperCase()}
      />
    );

    addHistory({
      time: new Date().toLocaleTimeString("ru-RU"),
      op: type.toUpperCase(),
      input: `r0=${a}, r1=${b}, C=${carryFlag}`,
      res: r,
      flags,
    });
  };

  const clearHistory = () => setHistory([]);

  const renderHint = () => {
    if (tab === "logical") {
      return (
        <div className="bit-calculator-examples">
          <h3>💡 Подсказка:</h3>
          <ul>
            <li><strong>AND</strong> - "оба" (результат 1 только если оба бита = 1)</li>
            <li><strong>ORR</strong> - "хотя бы один" (результат 1 если хоть один бит = 1)</li>
            <li><strong>EOR</strong> - "различны" (результат 1 если биты разные)</li>
            <li><strong>BIC</strong> - очистить биты (A AND NOT B)</li>
            <li><strong>MVN</strong> - инвертировать все биты (работает с одним числом)</li>
          </ul>
        </div>
      );
    }
    if (tab === "shifts") {
      return (
        <div className="bit-calculator-examples">
          <h3>💡 Подсказка по сдвигам:</h3>
          <ul>
            <li><strong>LSL</strong> - логический сдвиг влево (умножение на 2^n, справа входят нули)</li>
            <li><strong>LSR</strong> - логический сдвиг вправо (деление на 2^n, слева входят нули)</li>
            <li><strong>ASR</strong> - арифметический сдвиг вправо (деление с сохранением знака)</li>
            <li><strong>ROR</strong> - циклический сдвиг вправо (биты возвращаются)</li>
          </ul>
        </div>
      );
    }
    if (tab === "arithmetic") {
      return (
        <div className="bit-calculator-examples">
          <h3>💡 Подсказка по арифметике:</h3>
          <ul>
            <li><strong>ADD</strong> - сложение (r2 = r0 + r1)</li>
            <li><strong>SUB</strong> - вычитание (r2 = r0 - r1)</li>
            <li><strong>RSB</strong> - обратное вычитание (r2 = r1 - r0)</li>
            <li><strong>MUL</strong> - умножение (r2 = r0 × r1)</li>
            <li><strong>CMP</strong> - сравнение (устанавливает флаги, результат не сохраняется)</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  const renderConvertLabel = (value: number) =>
    inputBase === "dec" ? `Двоичное: ${formatBinary(value)}` : `Десятичное: ${value}`;

  return (
    <div className="bit-calculator-container">
      <div className="bit-calculator-header">
        <h1 className="bit-calculator-title">Калькулятор битовых операций</h1>
        <p className="bit-calculator-subtitle">
          Инструмент для изучения битовых, логических и арифметических операций в лабораторных работах по ЭВМ.
        </p>
      </div>

      <div className="bit-calculator-card">
        <div className="bit-calculator-card-header">
          <div>
            <div className="bit-calculator-card-title">Регистры</div>
            <div className="bit-calculator-card-description">Выберите систему ввода и задайте r0, r1.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {/* <div className="bit-calculator-carry-flag">
              Текущий C (перенос): <strong>{carryFlag}</strong>
            </div> */}
            <div className="bit-calculator-base-selector">
              <Button
                variant={inputBase === "dec" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleBaseChange("dec")}
              >
                Десятичный ввод
              </Button>
              <Button
                variant={inputBase === "bin" ? "default" : "secondary"}
                size="sm"
                onClick={() => handleBaseChange("bin")}
              >
                Двоичный ввод
              </Button>
            </div>
          </div>
        </div>

        <div>
          {tab !== "history" && (
            <div className="bit-calculator-input-section">
              <div className="bit-calculator-input-group">
                <label>Число A (r0)</label>
                <Input
                  type={inputBase === "dec" ? "number" : "text"}
                  inputMode={inputBase === "dec" ? "decimal" : "numeric"}
                  value={aInput}
                  onChange={(e) => handleNumberChange(e.target.value, "a")}
                  aria-invalid={Boolean(errors.a)}
                />
                <div className={`bit-calculator-input-hint ${errors.a ? "error" : ""}`}>
                  {errors.a ?? renderConvertLabel(a)}
                </div>
              </div>

              <div className="bit-calculator-input-group">
                <label>Число B (r1)</label>
                <Input
                  type={inputBase === "dec" ? "number" : "text"}
                  inputMode={inputBase === "dec" ? "decimal" : "numeric"}
                  value={bInput}
                  onChange={(e) => handleNumberChange(e.target.value, "b")}
                  aria-invalid={Boolean(errors.b)}
                />
                <div className={`bit-calculator-input-hint ${errors.b ? "error" : ""}`}>
                  {errors.b ?? renderConvertLabel(b)}
                </div>
              </div>

              {tab === "shifts" && (
                <div className="bit-calculator-input-group">
                  <label>Сдвиг (0..31)</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={shiftInput}
                    onChange={(e) => handleShiftChange(e.target.value)}
                    aria-invalid={Boolean(errors.shift)}
                  />
                  <div className={`bit-calculator-input-hint ${errors.shift ? "error" : ""}`}>
                    {errors.shift ?? "В ARM значение маскируется до 5 бит."}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bit-calculator-tabs">
            {(["logical", "shifts", "arithmetic", "history"] as const).map((key) => (
              <button
                key={key}
                className={`bit-calculator-tab ${tab === key ? "active" : ""}`}
                onClick={() => setTab(key)}
              >
                {tabsName[key]}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "30px" }}>
            {tab === "logical" && (
              <div className="bit-calculator-operations">
                <button className="bit-calculator-op-button" onClick={() => logical("and")}>
                  AND
                </button>
                <button className="bit-calculator-op-button" onClick={() => logical("orr")}>
                  ORR
                </button>
                <button className="bit-calculator-op-button" onClick={() => logical("eor")}>
                  EOR
                </button>
                <button className="bit-calculator-op-button" onClick={() => logical("bic")}>
                  BIC
                </button>
                <button className="bit-calculator-op-button" onClick={() => logical("mvn")}>
                  MVN
                </button>
              </div>
            )}

            {tab === "shifts" && (
              <div className="bit-calculator-operations">
                <button className="bit-calculator-op-button" onClick={() => shiftOp("lsl")}>
                  LSL
                </button>
                <button className="bit-calculator-op-button" onClick={() => shiftOp("lsr")}>
                  LSR
                </button>
                <button className="bit-calculator-op-button" onClick={() => shiftOp("asr")}>
                  ASR
                </button>
                <button className="bit-calculator-op-button" onClick={() => shiftOp("ror")}>
                  ROR
                </button>
              </div>
            )}

            {tab === "arithmetic" && (
              <div className="bit-calculator-operations">
                <button className="bit-calculator-op-button" onClick={() => arithmetic("add")}>
                  ADD
                </button>
                <button className="bit-calculator-op-button" onClick={() => arithmetic("sub")}>
                  SUB
                </button>
                <button className="bit-calculator-op-button" onClick={() => arithmetic("rsb")}>
                  RSB
                </button>
                <button className="bit-calculator-op-button" onClick={() => arithmetic("mul")}>
                  MUL
                </button>
                <button className="bit-calculator-op-button" onClick={() => arithmetic("cmp")}>
                  CMP (флаги)
                </button>
              </div>
            )}

            {tab === "history" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px" }}>
                  <Button size="sm" onClick={clearHistory} disabled={!history.length}>
                    Очистить историю
                  </Button>
                </div>
                <div className="bit-calculator-history">
                  {history.length === 0 && (
                    <div className="bit-calculator-empty-state">
                      История пуста — выполните любую операцию.
                    </div>
                  )}

                  {history.map((h, i) => (
                    <div key={`${h.time}-${i}`} className="bit-calculator-history-item">
                      <div className="bit-calculator-history-header">
                        <span className="bit-calculator-history-op">{h.op}</span>
                        <span className="bit-calculator-history-time">{h.time}</span>
                      </div>
                      <div className="bit-calculator-history-input">{h.input}</div>
                      <div className="bit-calculator-history-result">
                        = {h.res} (0x{toHex32(h.res)})
                      </div>
                      {h.flags && (
                        <div className="bit-calculator-history-flags">
                          Флаги: N={h.flags.N} Z={h.flags.Z}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result !== null && (
        <div className="bit-calculator-card">
          <div className="bit-calculator-result-section">
            <div className="bit-calculator-result-header">
              <div className="bit-calculator-result-label">
                Последний результат
              </div>
              {lastFlags && (
                <div className="bit-calculator-flags-grid">
                  {(["N", "Z"] as const).map((flag) => (
                    <div
                      key={flag}
                      className={`bit-calculator-flag-item ${
                        lastFlags[flag as keyof Flags] ? "active" : "inactive"
                      }`}
                    >
                      {flag} = {lastFlags[flag as keyof Flags] ?? "—"}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bit-calculator-result-representations">
              <div className="bit-calculator-repr-box">
                <div className="bit-calculator-repr-title">Decimal</div>
                <div className="bit-calculator-repr-value">{result}</div>
              </div>
              <div className="bit-calculator-repr-box">
                <div className="bit-calculator-repr-title">Hex</div>
                <div className="bit-calculator-repr-value">0x{toHex32(result)}</div>
              </div>
              <div className="bit-calculator-repr-box">
                <div className="bit-calculator-repr-title">Bin (32)</div>
                <div className="bit-calculator-repr-value">{formatBinary(result)}</div>
              </div>
            </div>
          </div>

          <div className="bit-calculator-visualization">
            <div className="bit-calculator-vis-title">Битовая визуализация (младшие 8 бит)</div>
            {vis}
          </div>

          {renderHint()}
        </div>
      )}
    </div>
  );
}
