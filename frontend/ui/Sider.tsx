import React from 'react';

interface SiderProps {
  width?: string | number;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

const Sider: React.FC<SiderProps> = ({ width = '250px', style, className, children }) => {
  return (
    <aside
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        backgroundColor: '#001529',
        color: 'white',
        padding: '20px',
        ...style,
      }}
      className={className}
    >
      {children}
    </aside>
  );
};

export default Sider;
