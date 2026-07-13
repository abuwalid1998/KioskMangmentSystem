declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module 'react' { const React: any; export default React; export const useMemo: any; export const useState: any; }
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module 'react-dom/client' { const ReactDOM: any; export default ReactDOM; export function createRoot(el: any): any; }
declare module 'react-i18next' { export function useTranslation(): any; export const initReactI18next: any; }
declare module 'react-chartjs-2' { export const Bar: any; export const Line: any; }
declare module 'chart.js' { export const Chart: any; export const CategoryScale: any; export const LinearScale: any; export const BarElement: any; export const PointElement: any; export const LineElement: any; export const Tooltip: any; export const Legend: any; }
declare module 'i18next' { const i18n: any; export default i18n; }
declare module 'bootstrap/dist/css/bootstrap.min.css';
declare module '*.css';
