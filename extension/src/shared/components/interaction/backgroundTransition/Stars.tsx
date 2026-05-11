import { Component, createSignal, For, onCleanup, onMount } from "solid-js";

interface StarsProps {
  isActive: boolean;
  isDarkMode: boolean;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  animationDelay: number;
  twinkleDuration: number;
}

const Stars: Component<StarsProps> = (props) => {
  const [stars, setStars] = createSignal<Star[]>([]);
  let containerEl: HTMLDivElement;

  const generateStars = () => {
    const starCount = 150; // Number of stars
    const newStars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100, // Random position 0-100%
        y: Math.random() * 100,
        size: Math.random() * 2 + 1, // Size between 1-3px
        animationDelay: Math.random() * 5, // Random delay 0-5s
        twinkleDuration: Math.random() * 3 + 2, // Duration 2-5s
      });
    }

    setStars(newStars);
  };

  onMount(() => {
    generateStars();
  });

  return (
    <div
      ref={containerEl!}
      class="stars-container"
      classList={{
        active: props.isActive && props.isDarkMode,
      }}
    >
      <For each={stars()}>
        {(star) => (
          <div
            class="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "animation-delay": `${star.animationDelay}s`,
              "animation-duration": `${star.twinkleDuration}s`,
            }}
          />
        )}
      </For>

      {/* Add some shooting stars for extra magic */}
      <div class="shooting-star shooting-star-1" />
      <div class="shooting-star shooting-star-2" />
      <div class="shooting-star shooting-star-3" />
    </div>
  );
};

export default Stars;
