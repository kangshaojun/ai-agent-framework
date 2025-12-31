import React from 'react';
import clsx from 'clsx';

interface FlexProps {
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Flex: React.FC<FlexProps> = ({
  align = 'stretch',
  justify = 'start',
  direction = 'row',
  wrap = 'nowrap',
  className,
  style,
  children,
}) => {
  const containerClass = clsx(
    'flex',
    {
      'flex-row': direction === 'row',
      'flex-col': direction === 'column',
      'flex-row-reverse': direction === 'row-reverse',
      'flex-col-reverse': direction === 'column-reverse',
      'items-start': align === 'start',
      'items-center': align === 'center',
      'items-end': align === 'end',
      'items-baseline': align === 'baseline',
      'items-stretch': align === 'stretch',
      'justify-start': justify === 'start',
      'justify-center': justify === 'center',
      'justify-end': justify === 'end',
      'justify-between': justify === 'between',
      'justify-around': justify === 'around',
      'justify-evenly': justify === 'evenly',
      'flex-wrap': wrap === 'wrap',
      'flex-wrap-reverse': wrap === 'wrap-reverse',
      'flex-nowrap': wrap === 'nowrap',
    },
    className,
  );

  return (
    <div className={containerClass} style={style}>
      {children}
    </div>
  );
};

export default Flex;
