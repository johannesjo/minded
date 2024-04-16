function isAnimationRunning(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.animationName !== "none" && style.animationPlayState === "running"
  );
}
