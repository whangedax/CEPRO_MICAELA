/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare const __IS_INSTITUTIONAL__: boolean;

