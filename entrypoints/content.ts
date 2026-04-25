import "~/assets/tailwind.css";

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log('Hello content.');
  },
});
