import { STRATEGIES, type Strategy } from "../types";

type StrategySelectProps = {
  value: Strategy;
  onChange: (value: Strategy) => void;
};

export function StrategySelect({ value, onChange }: StrategySelectProps) {
  return (
    <select
      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      onChange={(event) => onChange(event.target.value as Strategy)}
      value={value}
    >
      {STRATEGIES.map((strategy) => (
        <option key={strategy} value={strategy}>
          {strategy}
        </option>
      ))}
    </select>
  );
}
