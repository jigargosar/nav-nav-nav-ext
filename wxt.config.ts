import {resolve} from 'node:path';
import {defineConfig} from 'wxt';
import tailwindcss from "@tailwindcss/vite";


// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-solid'],
    vite: () => ({
        plugins: [tailwindcss()],
    }),
    webExt: {

        chromiumProfile: resolve('.wxt/chrome-data'),
        keepProfileChanges: true,

    },
});
