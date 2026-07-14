import { SECTORS, type Sector } from "../types";

type SectorSelectProps = {
  value: Sector;
  onChange: (value: Sector) => void;
  disabled?: boolean;
};

export function SectorSelect({ value, onChange, disabled = false }: SectorSelectProps) {
  return (
    <select
      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as Sector)}
      value={value}
    >
      {SECTORS.map((sector) => (
        <option key={sector} value={sector}>
          {sector}
        </option>
      ))}
    </select>
  );
}
