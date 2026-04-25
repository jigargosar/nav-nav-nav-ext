import {resolve} from 'node:path';
import {defineConfig} from 'wxt';
import tailwindcss from "@tailwindcss/vite";


// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-solid'],
    vite: () => ({
        plugins: [tailwindcss()],
    }),
    manifest: {
        permissions: ['storage'],
        action: {},
        commands: {
            'toggle-enabled': {
                suggested_key: {default: 'Alt+V'},
                description: 'Toggle nav-nav-nav on/off',
            },
        },
    },
    webExt: {
        chromiumProfile: resolve('.wxt/chrome-data'),
        keepProfileChanges: true,
    },
});
