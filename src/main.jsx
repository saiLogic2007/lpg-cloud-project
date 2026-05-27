import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Renders the main App into html root
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
