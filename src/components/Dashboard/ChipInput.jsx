// src/components/Dashboard/ChipInput.jsx
// チップ1人ぶんの入力欄。モード（持ち枚数／差）に応じた見せ方と読み取りだけを担当し、
// 保存する値は常に持ち枚数の文字列（chipInputToCount の結果）
import React, { useState } from 'react';
import { chipInputToCount, chipCountToInput, CHIP_INPUT_MODES } from '../../utils/scoreCalculation';

const ChipInput = ({ storedValue, mode, disabled = false, onCommit, className = '' }) => {
  // 入力中の文字列。null のときは保存値から作った表示を出す（blur で戻る）
  const [draft, setDraft] = useState(null);
  const isDiff = mode === CHIP_INPUT_MODES.DIFF;
  const shown = draft !== null ? draft : chipCountToInput(storedValue, mode);

  const handleChange = (e) => {
    setDraft(e.target.value);
    // type=number で「-」だけのときは value が '' になる。空欄として保存しない
    if (e.target.validity && e.target.validity.badInput) return;
    const count = chipInputToCount(e.target.value, mode);
    if (count !== null) onCommit(count);
  };

  return (
    <input
      type="number"
      step="1"
      value={shown}
      placeholder={isDiff ? '0' : '20'}
      disabled={disabled}
      onChange={handleChange}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
};

export default ChipInput;
