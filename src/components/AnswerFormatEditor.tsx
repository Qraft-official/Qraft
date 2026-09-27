"use client";

import {
  createAnswerOptionId,
  type AnswerOption,
  type ProblemAnswerType,
} from "@/lib/problem-answer";
import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";

const FORMATS: { id: ProblemAnswerType; label: string }[] = [
  { id: "answer", label: "答え入力" },
  { id: "choice", label: "選択問題" },
  { id: "written", label: "記述問題" },
];

export function AnswerFormatEditor({
  value,
  onChange,
  answer,
  onAnswer,
  unit,
  onUnit,
  options,
  onOptions,
  optionalAnswer = false,
}: {
  value: ProblemAnswerType;
  onChange: (value: ProblemAnswerType) => void;
  answer: string;
  onAnswer: (value: string) => void;
  unit: string;
  onUnit: (value: string) => void;
  options: AnswerOption[];
  onOptions: (value: AnswerOption[]) => void;
  optionalAnswer?: boolean;
}) {
  const radioGroup = `correct-answer-${useId()}`;
  return (
    <section className="space-y-3 border-b border-gray-800 px-3 py-3 md:px-4">
      <div>
        <p className="mb-1.5 text-xs font-bold text-muted">問題形式</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-800 p-1">
          {FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              aria-pressed={value === format.id}
              onClick={() => onChange(format.id)}
              className={`min-h-11 rounded-lg px-1 text-xs font-bold ${
                value === format.id ? "bg-aha text-black" : "text-muted"
              }`}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>

      {value === "answer" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-end gap-2">
          <label className="min-w-0 text-xs font-bold text-muted" htmlFor="answer-format-answer">
            答え{optionalAnswer ? "（任意）" : ""}
            <input
              id="answer-format-answer"
              value={answer}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder={optionalAnswer ? "未入力なら採点なし" : "答え（必須）"}
              className="mt-0.5 min-h-11 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm font-normal text-white outline-none placeholder:text-muted"
            />
          </label>
          <label className="min-w-0 text-xs font-bold text-muted" htmlFor="answer-format-unit">
            単位
            <input
              id="answer-format-unit"
              value={unit}
              maxLength={12}
              onChange={(event) => onUnit(event.target.value.slice(0, 12))}
              placeholder="任意"
              className="mt-0.5 min-h-11 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm font-normal text-white outline-none"
            />
          </label>
        </div>
      ) : null}

      {value === "choice" ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted">選択肢と正解</p>
          {options.map((option, index) => (
            <div key={option.id} className="flex min-w-0 items-center gap-2">
              <input
                type="radio"
                name={radioGroup}
                aria-label={`${index + 1}番目を正解にする`}
                checked={answer === option.id}
                onChange={() => onAnswer(option.id)}
                className="h-5 w-5 shrink-0 accent-lime-400"
              />
              <span className="w-5 shrink-0 text-xs text-muted">{String.fromCharCode(65 + index)}</span>
              <input
                value={option.text}
                onChange={(event) =>
                  onOptions(options.map((item) =>
                    item.id === option.id ? { ...item, text: event.target.value.slice(0, 500) } : item,
                  ))
                }
                aria-label={`選択肢 ${String.fromCharCode(65 + index)}`}
                placeholder={`選択肢 ${String.fromCharCode(65 + index)}`}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-800 bg-black px-3 text-sm text-white outline-none focus:border-aha"
              />
              <button
                type="button"
                disabled={options.length <= 2}
                onClick={() => {
                  const next = options.filter((item) => item.id !== option.id);
                  onOptions(next);
                  if (answer === option.id) onAnswer("");
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-muted disabled:opacity-30"
                aria-label={`選択肢 ${String.fromCharCode(65 + index)} を削除`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={options.length >= 6}
            onClick={() => onOptions([...options, { id: createAnswerOptionId(), text: "" }])}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-700 px-3 text-sm font-bold disabled:opacity-40"
          >
            <Plus size={16} /> 選択肢を追加
          </button>
          <p className="text-xs text-muted">丸を選んで正解を指定（2〜6択）</p>
        </div>
      ) : null}

      {value === "written" ? (
        <label className="block text-xs font-bold text-muted" htmlFor="answer-format-model">
          模範解答（任意・採点前は非表示）
          <textarea
            id="answer-format-model"
            value={answer}
            onChange={(event) => onAnswer(event.target.value)}
            rows={3}
            placeholder="文章や数式で入力"
            className="mt-1 min-h-20 w-full resize-y rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm font-normal text-white outline-none focus:border-aha"
          />
        </label>
      ) : null}
    </section>
  );
}
