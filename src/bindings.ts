import type {KeyBindingMap} from 'tinykeys'

// === scroll ===

const LINE_PX = 60

function scrollLines(n: number) {
    window.scrollBy({top: n * LINE_PX, behavior: 'auto'})
}

function scrollPages(fraction: number) {
    window.scrollBy({top: fraction * window.innerHeight, behavior: 'auto'})
}

function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'auto'})
}

function scrollToBottom() {
    window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'auto'})
}

// === history ===

function goBack() {
    window.history.back()
}

function goForward() {
    window.history.forward()
}

function reload() {
    window.location.reload()
}

// === keymap ===

export const defaultBindings: KeyBindingMap = {
    'g g': scrollToTop,
    'Shift+G': scrollToBottom,
    'j': () => scrollLines(3),
    'k': () => scrollLines(-3),
    'd': () => scrollPages(0.5),
    'u': () => scrollPages(-0.5),
    'Shift+H': goBack,
    'Shift+L': goForward,
    'r': reload,
}
