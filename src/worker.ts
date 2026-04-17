import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import { DEFAULT_CLIPPY_SETTINGS, normalizeClippySettings } from './settings.ts';

const SETTINGS_SCOPE = {
  scopeKind: 'instance' as const,
  stateKey: 'paperclip-clippy-plugin-settings'
};

const plugin = definePlugin({
  setup(ctx) {
    ctx.data.register('clippy-settings', async () => {
      const saved = await ctx.state.get(SETTINGS_SCOPE);
      return normalizeClippySettings(saved ?? DEFAULT_CLIPPY_SETTINGS);
    });

    ctx.actions.register('save-clippy-settings', async (input) => {
      const nextSettings = normalizeClippySettings(input);
      await ctx.state.set(SETTINGS_SCOPE, nextSettings);
      return nextSettings;
    });
  }
});

runWorker(plugin, import.meta.url);

export default plugin;
