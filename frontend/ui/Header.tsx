import React from 'react';

interface HeaderProps {
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ style, className, children }) => {
  return (
    <header
      style={{
        padding: '20px',
        backgroundColor: '#1890ff',
        color: 'white',
        ...style,
      }}
      className={className}
    >
      {children}
    </header>
  );
};

export default Header;
