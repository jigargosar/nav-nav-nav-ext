import {tinykeys, type KeyBindingMap} from 'tinykeys'

function isEditable(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function bindKeys(bindings: KeyBindingMap): () => void {
    const guarded: KeyBindingMap = {}
    for (const [combo, handler] of Object.entries(bindings)) {
        guarded[combo] = (e) => {
            if (isEditable(e.target)) return
            handler(e)
        }
    }
    return tinykeys(window, guarded)
}
