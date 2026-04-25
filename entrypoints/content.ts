import "~/assets/tailwind.css";
import {enterNormal} from '~/src/normal'
import {enterHint, type HintVariant} from '~/src/hint'

const ENABLED_KEY = 'enabled'

function assertNever(_: never): never {
    throw new Error('unreachable')
}

type Mode =
    | {tag: 'normal'; exit: () => void}
    | {tag: 'hint'; exit: () => void}

export default defineContentScript({
    matches: ['<all_urls>'],
    async main() {
        let mode: Mode | null = null

        const toNormal = () => {
            mode?.exit()
            mode = {tag: 'normal', exit: enterNormal({onHint: toHint})}
        }

        const toHint = (variant: HintVariant) => {
            mode?.exit()
            mode = {tag: 'hint', exit: enterHint(variant, {onExit: toNormal})}
        }

        const apply = (enabled: boolean) => {
            if (!enabled) {
                mode?.exit()
                mode = null
                console.log('[nav-nav-nav] disabled')
                return
            }
            if (mode === null) {
                toNormal()
                console.log('[nav-nav-nav] enabled')
                return
            }
            switch (mode.tag) {
                case 'normal': return
                case 'hint': return
                default: return assertNever(mode)
            }
        }

        const initial = await browser.storage.local.get(ENABLED_KEY)
        apply((initial[ENABLED_KEY] as boolean | undefined) ?? true)

        browser.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes[ENABLED_KEY]) return
            apply((changes[ENABLED_KEY].newValue as boolean | undefined) ?? true)
        })
    },
})
