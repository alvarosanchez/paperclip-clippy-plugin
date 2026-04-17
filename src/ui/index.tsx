import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  usePluginAction,
  usePluginData,
  type PluginBridgeError,
  type PluginSettingsPageProps
} from "@paperclipai/plugin-sdk/ui";

import {
  DEFAULT_CLIPPY_SETTINGS,
  normalizeClippySettings,
  type ClippySettings
} from "../settings.ts";
import { SETTINGS_ACTION_KEY, SETTINGS_DATA_KEY } from "../plugin.ts";
import { ClippyController } from "./clippy-controller.tsx";

export function ClippyGlobalToolbarButton() {
  return (
    <div className="clippy-toolbar-root">
      <ClippyController />
      <button type="button" className="clippy-toolbar-button">
        Clippy
      </button>
    </div>
  );
}

export function ClippySettingsPage(_props: PluginSettingsPageProps) {
  const { data, loading, error } = usePluginData<ClippySettings>(SETTINGS_DATA_KEY);
  const saveSettings = usePluginAction(SETTINGS_ACTION_KEY);
  const [draft, setDraft] = useState<ClippySettings>(DEFAULT_CLIPPY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const normalized = useMemo(
    () => normalizeClippySettings(data ?? DEFAULT_CLIPPY_SETTINGS),
    [data]
  );

  useEffect(() => {
    setDraft(normalized);
  }, [normalized]);

  const updateSetting = async (next: ClippySettings) => {
    setDraft(next);
    setSaving(true);
    setSaveError(null);
    try {
      await saveSettings({ ...next } as Record<string, unknown>);
    } catch (err) {
      setSaveError((err as PluginBridgeError).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = () => {
    void updateSetting({ ...draft, enabled: !draft.enabled });
  };

  const handleToggleDebug = () => {
    void updateSetting({ ...draft, showDebugPanel: !draft.showDebugPanel });
  };

  const handleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const mode = event.target.value as ClippySettings["interceptionMode"];
    void updateSetting({ ...draft, interceptionMode: mode });
  };

  return (
    <div
      style={{
        maxWidth: 560,
        padding: "24px 28px",
        display: "grid",
        gap: 16,
        fontFamily: "\"Segoe UI\", system-ui, sans-serif"
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Clippy Toast Hijacker</h1>
        <p style={{ margin: 0, color: "#4a4a4a", fontSize: 13 }}>
          Toggle the overlay and choose how aggressive the interception should be.
        </p>
      </header>

      <section
        style={{
          border: "1px solid #e2e2e2",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
          background: "#ffffff"
        }}
      >
        <label style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Enable interception</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={handleToggleEnabled}
            disabled={loading || saving}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Interception mode</span>
          <select
            value={draft.interceptionMode}
            onChange={handleModeChange}
            disabled={loading || saving}
          >
            <option value="aggressive">Aggressive (default)</option>
            <option value="invasive">Invasive (wider net)</option>
          </select>
        </label>

        <label style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Show debug overlay</span>
          <input
            type="checkbox"
            checked={draft.showDebugPanel}
            onChange={handleToggleDebug}
            disabled={loading || saving}
          />
        </label>
      </section>

      {loading ? (
        <div style={{ color: "#4a4a4a" }}>Loading settings...</div>
      ) : null}
      {error ? (
        <div style={{ color: "#b00020" }}>Failed to load settings: {error.message}</div>
      ) : null}
      {saveError ? (
        <div style={{ color: "#b00020" }}>Failed to save settings: {saveError}</div>
      ) : null}
      {saving ? <div style={{ color: "#4a4a4a" }}>Saving...</div> : null}
    </div>
  );
}

const ui = {
  clippy: true
};

export default ui;
