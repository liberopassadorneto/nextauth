import { AppProps } from 'next/app';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';

function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default App;
