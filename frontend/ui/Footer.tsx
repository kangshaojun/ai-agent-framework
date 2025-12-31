import React from 'react';

interface FooterProps {
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({ style, className, children }) => {
  return (
    <footer
      style={{
        padding: '20px',
        backgroundColor: '#001529',
        color: 'white',
        textAlign: 'center',
        ...style,
      }}
      className={className}
    >
      {children}
    </footer>
  );
};

export default Footer;
