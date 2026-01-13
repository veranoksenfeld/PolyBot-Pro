import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-full w-full bg-gray-900 text-gray-100 font-sans selection:bg-primary/30">
      {children}
    </div>
  );
};