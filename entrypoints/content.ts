import "~/assets/tailwind.css";

const ENABLED_KEY = 'enabled'

export default defineContentScript({
    matches: ['<all_urls>'],
    async main() {
        const initial = await browser.storage.local.get(ENABLED_KEY)
        let enabled: boolean = (initial[ENABLED_KEY] as boolean | undefined) ?? true
        console.log('[nav-nav-nav]', enabled ? 'enabled' : 'disabled')

        browser.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes[ENABLED_KEY]) return
            enabled = (changes[ENABLED_KEY].newValue as boolean | undefined) ?? true
            console.log('[nav-nav-nav]', enabled ? 'enabled' : 'disabled')
        })
    },
})
