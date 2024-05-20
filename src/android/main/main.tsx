import { render } from "solid-js/web";
import "./main.scss";
import RoutesCmp from "@src/shared/RouteCmp";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <RoutesCmp />, appContainer);
