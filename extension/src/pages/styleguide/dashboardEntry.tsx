import { render } from "solid-js/web";
// @ts-ignore — side-effect import of global styles
import "@src/styles/sharedMain.scss";
import RoutesCmp from "@src/shared/RouteCmp";
import { isDarkModeNow } from "@src/shared/addWrapperClasses";
import { seedMockData } from "./seedMockData";

// Dashboard simulation: mounts the real app shell (RouteCmp's RoutesCmp — the
// MainWrapper, persistent companion sun, bottom bar, interaction overlay and the
// dashboard at "/") on a plain web page, backed by the in-memory chrome shim in
// dashboard.html. Lets the full dashboard + interaction flow be exercised and
// deployed as a preview without loading the extension.
//
// By default a representative dataset is seeded so the "show all" grid has
// content; pass `?seed=none` to boot the fresh, first-run state instead.
const root = document.getElementById("minded-6622");
if (!root) throw new Error("Cannot find #minded-6622 root element");

// Apply the day/night theme to the wrapper up front. The shell normally does
// this in RouteCmp's onMount via addWrapperClasses(), but in this standalone
// simulation chunk that call's DOM side effects get tree-shaken away — leaving
// the dashboard stuck in light mode at night (black icons that never get their
// dark-mode `filter: invert(1)`, wrong surface colours, a sun instead of the
// moon). Setting the class here, from the entry module on a runtime value, can't
// be eliminated, so the simulation matches the real app. RouteCmp's onMount then
// reads this same class to pick the moon vs. sun companion.
if (isDarkModeNow()) {
  root.classList.add("minded-6622-dark");
}

const shouldSeed =
  new URLSearchParams(window.location.search).get("seed") !== "none";

const mount = () => render(() => <RoutesCmp />, root);

if (shouldSeed) {
  seedMockData()
    .catch((e) => console.error("seedMockData failed:", e))
    .finally(mount);
} else {
  mount();
}
