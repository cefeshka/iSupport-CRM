import { useState } from 'react';

interface ColorOption {
  name: string;
  value: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    name: 'Melns',
    value: 'Melns',
    bgColor: 'bg-gray-900',
    textColor: 'text-white',
  },
  {
    name: 'Balts',
    value: 'Balts',
    bgColor: 'bg-white',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300',
  },
  {
    name: 'Sudrabs',
    value: 'Sudrabs',
    bgColor: 'bg-gray-300',
    textColor: 'text-gray-900',
  },
  {
    name: 'Zelts',
    value: 'Zelts',
    bgColor: 'bg-yellow-500',
    textColor: 'text-gray-900',
  },
  {
    name: 'Space Gray',
    value: 'Space Gray',
    bgColor: 'bg-gray-600',
    textColor: 'text-white',
  },
  {
    name: 'Zils',
    value: 'Zils',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  {
    name: 'Zaļš',
    value: 'Zaļš',
    bgColor: 'bg-green-500',
    textColor: 'text-white',
  },
  {
    name: 'Sarkans',
    value: 'Sarkans',
    bgColor: 'bg-red-500',
    textColor: 'text-white',
  },
  {
    name: 'Rozā',
    value: 'Rozā',
    bgColor: 'bg-pink-400',
    textColor: 'text-white',
  },
  {
    name: 'Violets',
    value: 'Violets',
    bgColor: 'bg-purple-500',
    textColor: 'text-white',
  },
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color: ColorOption) => {
    onChange(color.value);
    setIsOpen(false);
  };

  const selectedColor = COLOR_OPTIONS.find(c => c.value === value);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="space-y-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ievadiet krāsu"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => handleColorSelect(color)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${color.bgColor} ${color.textColor}
                ${color.borderColor ? `border ${color.borderColor}` : ''}
                ${value === color.value ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}
                shadow-sm hover:shadow-md
              `}
              title={`Izvēlēties ${color.name}`}
            >
              {color.name}
            </button>
          ))}
        </div>
      </div>

      {value && (
        <div className="text-xs text-gray-500">
          Izvēlēta krāsa: <span className="font-medium text-gray-700">{value}</span>
        </div>
      )}
    </div>
  );
}
