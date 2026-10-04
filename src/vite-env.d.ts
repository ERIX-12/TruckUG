/// <reference types="vite/client" />

declare module '*?worker&url' {
  const content: string;
  export default content;
}

declare module '*?url' {
  const content: string;
  export default content;
}
