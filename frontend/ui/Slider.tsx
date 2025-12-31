import React, { useState } from 'react';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ min = 0, max = 100, step = 1, value = 50, onChange }) => {

  const [currentValue, setCurrentValue] = useState<number>(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setCurrentValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }

  return (
    <div className="flex flex-col items-center space-y-2 w-96">
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleSliderChange}
        className="w-full h-2 rounded-lg cursor-pointer"
        style={{ background: `linear-gradient(to right, #4f46e5 ${((currentValue - min) / (max - min)) * 100}%, #d1d5db 0%)` }}
      />
      <div className="text-blue-600">{currentValue}</div>

    </div>
  );
};

export default Slider;
