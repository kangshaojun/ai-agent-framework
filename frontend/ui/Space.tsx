import React from 'react';
import clsx from 'clsx';

interface SpaceProps {
  align?: 'start' | 'center' | 'end' | 'baseline';
  className?: string;
  direction?: 'horizontal' | 'vertical';
  size?: 'small' | 'middle' | 'large' | number;
  split?: React.ReactNode;
  style?: React.CSSProperties;
  wrap?: boolean;
  children: React.ReactNode;
}

const sizeMap = {
  small: 8,
  middle: 16,
  large: 24,
};

const Space: React.FC<SpaceProps> = ({
  align = 'center',
  className,
  direction = 'horizontal',
  size = 'small',
  split,
  style,
  wrap = false,
  children,
}) => {
  const marginSize = typeof size === 'string' ? sizeMap[size] : size

  const isHorizontal = direction === 'horizontal';
  const containerClass = clsx(
    'flex',
    {
      'flex-wrap': wrap,
      'flex-col': !isHorizontal,
      [`items-${align}`]: align,
    },
    className,
  );

  const itemStyle = isHorizontal
    ? { marginRight: marginSize }
    : { marginBottom: marginSize };

  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <div className={containerClass} style={style}>
      {items.map((child, index) => (
        <React.Fragment key={index}>
          <div style={index === items.length - 1 ? {} : itemStyle}>{child}</div>
          {split && index < items.length - 1 && <span className='mx-2'>{split}</span>}
        </React.Fragment>
      ))

      }
    </div>
  );

};

export default Space;
