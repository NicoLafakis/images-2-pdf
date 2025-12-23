/// <reference types="vite/client" />

interface Window {
  jspdf: {
    jsPDF: typeof import('jspdf').jsPDF;
  };
}
