// Re-export the native module. On web, it will be resolved to MiragePeerTransportModule.web.ts
// and on native platforms to MiragePeerTransportModule.ts
export { default } from './src/MiragePeerTransportModule';
export * from './src/MiragePeerTransport.types';
