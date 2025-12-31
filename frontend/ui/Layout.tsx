import React from 'react';

interface LayoutProps {
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
  hasSider?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ style, className, children, hasSider }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: hasSider ? 'row' : 'column',
        minHeight: '100vh',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export default Layout;
