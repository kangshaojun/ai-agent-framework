import React from 'react';

interface ContentProps {
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

const Content: React.FC<ContentProps> = ({ style, className, children }) => {
  return (
    <main
      style={{
        flex: 1,
        padding: '20px',
        backgroundColor: '#f0f2f5',
        ...style,
      }}
      className={className}
    >
      {children}
    </main>
  );
};

export default Content;
