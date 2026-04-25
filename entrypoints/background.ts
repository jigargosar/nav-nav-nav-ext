const ENABLED_KEY = 'enabled'

async function getEnabled(): Promise<boolean> {
    const r = await browser.storage.local.get(ENABLED_KEY)
    return (r[ENABLED_KEY] as boolean | undefined) ?? true
}

async function setBadge(enabled: boolean) {
    await browser.action.setBadgeText({text: enabled ? 'ON' : 'OFF'})
    await browser.action.setBadgeBackgroundColor({color: enabled ? '#16a34a' : '#6b7280'})
}

async function toggle() {
    const next = !(await getEnabled())
    await browser.storage.local.set({[ENABLED_KEY]: next})
    await setBadge(next)
}

export default defineBackground(() => {
    browser.runtime.onInstalled.addListener(async () => {
        await setBadge(await getEnabled())
    })

    browser.runtime.onStartup.addListener(async () => {
        await setBadge(await getEnabled())
    })

    browser.commands.onCommand.addListener((command) => {
        if (command === 'toggle-enabled') void toggle()
    })

    browser.action.onClicked.addListener(() => void toggle())
})
