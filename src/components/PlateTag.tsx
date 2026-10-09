import React from 'react';

interface PlateTagProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlateTag: React.FC<PlateTagProps> = ({ plate, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 border',
    md: 'text-sm px-2.5 py-1 border-[1.5px]',
    lg: 'text-base px-3.5 py-1.5 border-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold tracking-wider rounded bg-[#F2B705] text-[#1A1500] border-[#14181F] shadow-sm select-none ${sizeClasses[size]} ${className}`}
      title={`Uganda Vehicle Registration: ${plate}`}
    >
      <span className="bg-[#14181F] text-[#F2B705] text-[9px] px-1 py-0.2 rounded font-extrabold tracking-normal">
        UG
      </span>
      <span>{plate}</span>
    </span>
  );
};
