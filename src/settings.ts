export type ClippyInterceptionMode = 'aggressive' | 'invasive';

export interface ClippySettings {
  enabled: boolean;
  interceptionMode: ClippyInterceptionMode;
  showDebugPanel: boolean;
}

export const DEFAULT_CLIPPY_SETTINGS: ClippySettings = {
  enabled: true,
  interceptionMode: 'aggressive',
  showDebugPanel: false
};

export function normalizeClippySettings(input: unknown): ClippySettings {
  const record =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {};
  const interceptionMode =
    record.interceptionMode === 'invasive' ? 'invasive' : 'aggressive';

  return {
    enabled: record.enabled === false ? false : true,
    interceptionMode,
    showDebugPanel: record.showDebugPanel === true
  };
}
