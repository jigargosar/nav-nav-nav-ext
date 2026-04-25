export function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'auto'})
}

export function scrollToBottom() {
    window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'auto'})
}
