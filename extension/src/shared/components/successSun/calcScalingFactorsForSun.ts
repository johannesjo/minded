const SUN_MAX_SCALE = 19;

export const calcScalingFactorsForSun = (
  sunEl: HTMLElement,
): { scaleSmaller: number; scaleBigger: number } => {
  // Get the width and height of the page
  const pageWidth = window.innerWidth;
  const pageHeight = window.innerHeight;

  // Get the width and height of the element
  const elementWidth = sunEl.offsetWidth;
  const elementHeight = sunEl.offsetHeight;

  // Calculate the scaling factor
  const scaleX = pageWidth / elementWidth;
  const scaleY = pageHeight / elementHeight;

  let scaleSmaller = Math.min(scaleY, scaleX);
  let scaleBigger = Math.max(scaleY, scaleX);
  if (scaleSmaller < 9) {
    scaleSmaller = (scaleBigger + scaleSmaller) / 2;
    scaleBigger = scaleBigger + 1;
  } else {
    scaleSmaller = scaleSmaller - 1;
    scaleBigger = scaleBigger + 1;
  }
  scaleSmaller = Math.min(scaleSmaller, SUN_MAX_SCALE);

  // Return the scaling factor
  return { scaleSmaller, scaleBigger };
};
