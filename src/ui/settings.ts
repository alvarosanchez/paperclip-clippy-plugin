export interface ClippySettings {
  enabled: boolean;
  interceptionMode: 'aggressive';
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

  return {
    enabled: record.enabled === false ? false : true,
    interceptionMode: 'aggressive',
    showDebugPanel: record.showDebugPanel === true
  };
}
