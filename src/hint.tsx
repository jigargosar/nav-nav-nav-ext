import {createSignal, For, type Component} from 'solid-js'
import {render} from 'solid-js/web'

// === types ===

export type HintVariant = 'same-tab' | 'new-tab'

interface Target {
    el: Element
    label: string
    rect: DOMRect
}

// === clickable discovery ===

const CLICKABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    'label',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisibleInViewport(el: Element): DOMRect | null {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null
    if (rect.right <= 0 || rect.left >= window.innerWidth) return null
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') return null
    return rect
}

function findTargets(): {el: Element; rect: DOMRect}[] {
    const out: {el: Element; rect: DOMRect}[] = []
    const seen = new Set<Element>()
    document.querySelectorAll(CLICKABLE_SELECTOR).forEach((el) => {
        if (seen.has(el)) return
        seen.add(el)
        const rect = isVisibleInViewport(el)
        if (rect) out.push({el, rect})
    })
    return out
}

// === label assignment ===

// home row first (easiest), then top row, then bottom row
const ALPHABET = 'fjdkslaghrueiwoptyvbcnmxzq'

function assignLabels(count: number): string[] {
    if (count <= ALPHABET.length) {
        return ALPHABET.slice(0, count).split('')
    }
    const labels: string[] = []
    const pairLen = Math.ceil(count / ALPHABET.length)
    outer: for (let i = 0; i < ALPHABET.length; i++) {
        for (let j = 0; j < pairLen; j++) {
            labels.push(ALPHABET[i] + ALPHABET[j])
            if (labels.length === count) break outer
        }
    }
    return labels
}

// === click action ===

function activate(el: Element, variant: HintVariant) {
    if (variant === 'new-tab' && el instanceof HTMLAnchorElement && el.href) {
        window.open(el.href, '_blank')
        return
    }
    if (el instanceof HTMLElement) el.click()
}

// === overlay component ===

const Overlay: Component<{targets: () => Target[]; typed: () => string}> = (props) => {
    return (
        <For each={props.targets()}>
            {(t) => {
                const remaining = () => {
                    const typed = props.typed()
                    return t.label.startsWith(typed) ? t.label.slice(typed.length) : null
                }
                return (
                    <span
                        style={{
                            position: 'fixed',
                            left: `${t.rect.left}px`,
                            top: `${t.rect.top}px`,
                            'z-index': '2147483647',
                            background: remaining() ? '#fde68a' : '#9ca3af',
                            color: '#111827',
                            border: '1px solid #92400e',
                            'border-radius': '3px',
                            padding: '0 3px',
                            font: 'bold 12px monospace',
                            'line-height': '14px',
                            'pointer-events': 'none',
                            opacity: remaining() ? '1' : '0.4',
                        }}
                    >
                        {remaining() ?? t.label}
                    </span>
                )
            }}
        </For>
    )
}

// === lifecycle ===

export interface HintDeps {
    onExit: () => void
}

export function enterHint(variant: HintVariant, deps: HintDeps): () => void {
    const found = findTargets()
    if (found.length === 0) {
        queueMicrotask(deps.onExit)
        return () => {}
    }

    const labels = assignLabels(found.length)
    const targets: Target[] = found.map((f, i) => ({el: f.el, label: labels[i], rect: f.rect}))

    const host = document.createElement('div')
    host.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
    document.documentElement.appendChild(host)
    const shadow = host.attachShadow({mode: 'closed'})
    const root = document.createElement('div')
    shadow.appendChild(root)

    const [typed, setTyped] = createSignal('')
    const [list] = createSignal(targets)

    const dispose = render(() => <Overlay targets={list} typed={typed} />, root)

    let exited = false
    const cleanup = () => {
        if (exited) return
        exited = true
        window.removeEventListener('keydown', onKey, true)
        dispose()
        host.remove()
    }

    const exitToNormal = () => {
        cleanup()
        deps.onExit()
    }

    const onKey = (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.key === 'Escape' || (e.key === 'f' && !e.shiftKey) || (e.key === 'F' && e.shiftKey)) {
            exitToNormal()
            return
        }

        if (e.key === 'Backspace') {
            setTyped(typed().slice(0, -1))
            return
        }

        if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return

        const next = typed() + e.key.toLowerCase()
        const matches = targets.filter((t) => t.label.startsWith(next))
        if (matches.length === 0) {
            exitToNormal()
            return
        }
        if (matches.length === 1 && matches[0].label === next) {
            const hit = matches[0]
            cleanup()
            activate(hit.el, variant)
            deps.onExit()
            return
        }
        setTyped(next)
    }

    window.addEventListener('keydown', onKey, true)

    return cleanup
}
