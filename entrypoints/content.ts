import "~/assets/tailwind.css";
import {bindKeys} from '~/src/keys'
import {scrollToBottom, scrollToTop} from '~/src/scroll'

const ENABLED_KEY = 'enabled'

export default defineContentScript({
    matches: ['<all_urls>'],
    async main() {
        let unbind: (() => void) | null = null

        const apply = (enabled: boolean) => {
            unbind?.()
            unbind = enabled
                ? bindKeys({
                    'g g': scrollToTop,
                    'Shift+G': scrollToBottom,
                })
                : null
            console.log('[nav-nav-nav]', enabled ? 'enabled' : 'disabled')
        }

        const initial = await browser.storage.local.get(ENABLED_KEY)
        apply((initial[ENABLED_KEY] as boolean | undefined) ?? true)

        browser.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes[ENABLED_KEY]) return
            apply((changes[ENABLED_KEY].newValue as boolean | undefined) ?? true)
        })
    },
})
