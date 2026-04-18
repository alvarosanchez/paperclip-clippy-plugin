import { definePlugin } from '@paperclipai/plugin-sdk';
import { SETTINGS_ACTION_KEY, SETTINGS_DATA_KEY } from './plugin-keys.ts';
import { DEFAULT_CLIPPY_SETTINGS, normalizeClippySettings } from './settings.ts';

const SETTINGS_SCOPE = {
  scopeKind: 'instance' as const,
  stateKey: 'paperclip-clippy-plugin-settings'
};

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(SETTINGS_DATA_KEY, async () => {
      const saved = await ctx.state.get(SETTINGS_SCOPE);
      return normalizeClippySettings(saved ?? DEFAULT_CLIPPY_SETTINGS);
    });

    ctx.actions.register(SETTINGS_ACTION_KEY, async (input) => {
      const nextSettings = normalizeClippySettings(input);
      await ctx.state.set(SETTINGS_SCOPE, nextSettings);
      return nextSettings;
    });
  }
});

export default plugin;
