import {createSignal, For, type Component} from 'solid-js'
import {render} from 'solid-js/web'

// === types ===

export type HintVariant = 'same-tab' | 'new-tab'

interface Target {
    el: Element
    label: string
    rect: DOMRect
    labelRect: DOMRect
    cluster: number // -1 if not in any overlap cluster
    indexInCluster: number // 0 if not clustered
    clusterSize: number // 1 if not clustered
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
// 'f' is reserved as the hint trigger and never appears as a label letter
const ALPHABET = 'jdkslaghrueiwoptyvbcnmxzq'

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

// === overlap clustering ===

// approximate label badge size: ~11px per char + padding
function estimateLabelRect(targetRect: DOMRect, label: string): DOMRect {
    const w = label.length * 11 + 12
    const h = 22
    return new DOMRect(targetRect.left, targetRect.top, w, h)
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
    return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)
}

interface ClusterInfo {
    cluster: number
    indexInCluster: number
    clusterSize: number
}

// union-find clustering on label rects
function clusterByOverlap(targets: {labelRect: DOMRect}[]): ClusterInfo[] {
    const n = targets.length
    const parent = Array.from({length: n}, (_, i) => i)
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
    const union = (a: number, b: number) => {
        const ra = find(a), rb = find(b)
        if (ra !== rb) parent[ra] = rb
    }
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (rectsOverlap(targets[i].labelRect, targets[j].labelRect)) union(i, j)
        }
    }
    const sizeByRoot = new Map<number, number>()
    const indexByRoot = new Map<number, number>()
    for (let i = 0; i < n; i++) {
        const r = find(i)
        sizeByRoot.set(r, (sizeByRoot.get(r) ?? 0) + 1)
    }
    const rootToCluster = new Map<number, number>()
    let nextId = 0
    const out = new Array<ClusterInfo>(n)
    for (let i = 0; i < n; i++) {
        const r = find(i)
        const size = sizeByRoot.get(r) ?? 1
        if (size < 2) {
            out[i] = {cluster: -1, indexInCluster: 0, clusterSize: 1}
            continue
        }
        if (!rootToCluster.has(r)) rootToCluster.set(r, nextId++)
        const idx = indexByRoot.get(r) ?? 0
        indexByRoot.set(r, idx + 1)
        out[i] = {cluster: rootToCluster.get(r)!, indexInCluster: idx, clusterSize: size}
    }
    return out
}

// === click action ===

function activate(el: Element, variant: HintVariant) {
    if (!(el instanceof HTMLElement)) return
    if (variant === 'same-tab') {
        el.click()
        return
    }
    // new-tab: synthesize a Ctrl+Click so the browser opens in a background tab
    el.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        ctrlKey: true,
        metaKey: true, // for macOS
    }))
}

// === overlay component ===

interface OverlayProps {
    targets: () => Target[]
    typed: () => string
    cycle: () => number
    variant: () => HintVariant
}

const Overlay: Component<OverlayProps> = (props) => {
    return (
        <For each={props.targets()}>
            {(t) => {
                const upper = () => props.variant() === 'new-tab'
                const display = (s: string) => (upper() ? s.toUpperCase() : s)
                const remaining = () => {
                    const typed = props.typed()
                    return t.label.startsWith(typed) ? t.label.slice(typed.length) : null
                }
                const z = () => {
                    if (t.cluster < 0) return 1000
                    const order = (t.indexInCluster + props.cycle()) % t.clusterSize
                    return 2000 + order
                }
                return (
                    <span
                        style={{
                            position: 'fixed',
                            left: `${t.rect.left}px`,
                            top: `${t.rect.top}px`,
                            'z-index': String(z()),
                            background: remaining() ? '#fde68a' : '#9ca3af',
                            color: '#111827',
                            border: '1px solid #92400e',
                            'border-radius': '4px',
                            padding: '2px 5px',
                            font: 'bold 15px monospace',
                            'line-height': '18px',
                            'pointer-events': 'none',
                            opacity: remaining() ? '1' : '0.4',
                        }}
                    >
                        {display(remaining() ?? t.label)}
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

export function enterHint(initialVariant: HintVariant, deps: HintDeps): () => void {
    const found = findTargets()
    if (found.length === 0) {
        queueMicrotask(deps.onExit)
        return () => {}
    }

    const labels = assignLabels(found.length)
    const partial = found.map((f, i) => ({
        el: f.el,
        label: labels[i],
        rect: f.rect,
        labelRect: estimateLabelRect(f.rect, labels[i]),
    }))
    const clusters = clusterByOverlap(partial)
    const targets: Target[] = partial.map((p, i) => ({...p, ...clusters[i]}))

    const host = document.createElement('div')
    host.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
    document.documentElement.appendChild(host)
    const shadow = host.attachShadow({mode: 'closed'})
    const root = document.createElement('div')
    shadow.appendChild(root)

    const [typed, setTyped] = createSignal('')
    const [list] = createSignal(targets)
    const [cycle, setCycle] = createSignal(0)
    const [variant, setVariant] = createSignal<HintVariant>(initialVariant)

    const dispose = render(
        () => <Overlay targets={list} typed={typed} cycle={cycle} variant={variant} />,
        root,
    )

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

        if (e.key === 'Escape') {
            exitToNormal()
            return
        }

        // f / F switch variants while staying in hint mode
        if (e.key === 'f' || e.key === 'F') {
            const next: HintVariant = e.shiftKey ? 'new-tab' : 'same-tab'
            setVariant(next)
            return
        }

        if (e.key === ' ') {
            setCycle((c) => c + 1)
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
            const v = variant()
            if (v === 'new-tab') {
                // open in background, stay in mode, clear buffer
                activate(hit.el, 'new-tab')
                setTyped('')
                return
            }
            // same-tab: open and exit
            cleanup()
            activate(hit.el, 'same-tab')
            deps.onExit()
            return
        }
        setTyped(next)
    }

    window.addEventListener('keydown', onKey, true)

    return cleanup
}
