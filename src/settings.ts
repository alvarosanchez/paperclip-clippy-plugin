export type ClippyInterceptionMode = 'aggressive' | 'invasive';

export interface ClippySettings {
  enabled: boolean;
  interceptionMode: ClippyInterceptionMode;
  showDebugPanel: boolean;
}

export const DEFAULT_CLIPPY_SETTINGS: ClippySettings = {
  enabled: false,
  interceptionMode: 'aggressive',
  showDebugPanel: false
};

export function normalizeClippySettings(input: unknown): ClippySettings {
  const record =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {};
  const interceptionMode =
    record.interceptionMode === 'invasive'
      || record.interceptionMode === 'aggressive'
      ? record.interceptionMode
      : DEFAULT_CLIPPY_SETTINGS.interceptionMode;
  const enabled =
    typeof record.enabled === 'boolean'
      ? record.enabled
      : DEFAULT_CLIPPY_SETTINGS.enabled;
  const showDebugPanel =
    typeof record.showDebugPanel === 'boolean'
      ? record.showDebugPanel
      : DEFAULT_CLIPPY_SETTINGS.showDebugPanel;

  return {
    enabled,
    interceptionMode,
    showDebugPanel
  };
}
