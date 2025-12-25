import { useState, useEffect } from 'react';

export type BitMode = 8 | 16 | 32 | 64;

export const useBitwise = () => {
  const [value, setValue] = useState<bigint>(0n);
  const [history, setHistory] = useState<{op: string, val: bigint}[]>([]);
  const [mode, setMode] = useState<BitMode>(64);

  // Загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bit_calc_value');
    if (saved) setValue(BigInt(saved));
  }, []);

  // Сохранение
  useEffect(() => {
    localStorage.setItem('bit_calc_value', value.toString());
  }, [value]);

  const mask = (m: BitMode) => (1n << BigInt(m)) - 1n;

  const updateValue = (newVal: bigint, label: string) => {
    const masked = newVal & mask(mode);
    setHistory(prev => [{ op: label, val: masked }, ...prev].slice(0, 20));
    setValue(masked);
  };

  const toggleBit = (bitIndex: number) => {
    setValue(prev => prev ^ (1n << BigInt(bitIndex)));
  };

  const clear = () => {
    setHistory([]);
    setValue(0n);
  };

  return { value, setValue, history, mode, setMode, toggleBit, updateValue, clear };
};