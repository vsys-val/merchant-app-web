import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MobilePrototype } from './MobilePrototype';
import './prototype.css';
if (new URLSearchParams(location.search).has('framed')) document.body.classList.add('framed');
createRoot(document.getElementById('root')!).render(<StrictMode><MobilePrototype /></StrictMode>);
