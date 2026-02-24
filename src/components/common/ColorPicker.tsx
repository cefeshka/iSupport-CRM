import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const handleColorSelect = (color: ColorOption) => {
    onChange(color.value);
  };

  const selectedColor = COLOR_OPTIONS.find(c => c.value === value);

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="space-y-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ievadiet krāsu"
          className="input-premium w-full"
        />

        <div className="form-section p-4">
          <p className="text-xs font-medium text-slate-600 mb-3">Быстрый выбор:</p>
          <div className="grid grid-cols-5 gap-2">
            {COLOR_OPTIONS.map((color) => (
              <motion.button
                key={color.value}
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleColorSelect(color)}
                className={`
                  relative px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                  ${color.bgColor} ${color.textColor}
                  ${color.borderColor ? `border-2 ${color.borderColor}` : 'border-2 border-transparent'}
                  ${value === color.value ? 'ring-2 ring-primary-500 ring-offset-2 shadow-glow' : 'hover:shadow-medium'}
                `}
                title={`Izvēlēties ${color.name}`}
              >
                {value === color.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 -mt-1 -mr-1"
                  >
                    <div className="bg-primary-500 rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </motion.div>
                )}
                {color.name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg"
        >
          Izvēlēta krāsa: <span className="font-semibold text-slate-900">{value}</span>
        </motion.div>
      )}
    </div>
  );
}
