export function stopAllVideos(): void {
  // Select all video elements in the main document
  const videos = document.querySelectorAll("video");
  for (const video of videos) {
    video.pause();
  }

  // Select all shadow roots in the main document
  const shadowRoots = findRoots(document.body);

  if (!shadowRoots.length) {
    return;
  }

  for (const shadowRoot of shadowRoots) {
    // Select all video elements in each shadow root
    const shadowVideos = shadowRoot.querySelectorAll("video");
    for (const video of shadowVideos) {
      video.pause();
    }
  }
}

function findRoots(baseEl) {
  return [baseEl, ...baseEl.querySelectorAll("*")]
    .filter((e) => !!e.shadowRoot)
    .flatMap((e) => [e.shadowRoot, ...findRoots(e.shadowRoot)]);
}
