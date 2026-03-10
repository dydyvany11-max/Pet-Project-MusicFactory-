import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Если хотите измерять производительность, передайте функцию
// для логирования результатов (например: reportWebVitals(console.log))
// или отправляйте данные на аналитический эндпоинт. Подробнее: https://bit.ly/CRA-vitals
reportWebVitals();
