/**
 * Sets up automatic scrolling of focused inputs to center when Android keyboard opens.
 * Uses focus event with 300ms delay (best practice for keyboard animation settling).
 *
 * @see https://uiduck.com/posts/fix-mobile-form-flow-with-scrollintoview/
 */
export function setupKeyboardScrolling(): void {
  document.addEventListener(
    "focus",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "instant", block: "center" });
        }, 300);
      }
    },
    true,
  );
}
