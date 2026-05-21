import { render } from "solid-js/web";

// @ts-ignore - side-effect import of global styles
import "@src/styles/sharedMain.scss";
import Screenshots from "./Screenshots";

const root = document.getElementById("minded-6622");
if (!root) throw new Error("Cannot find #minded-6622 root element");

render(() => <Screenshots />, root);
