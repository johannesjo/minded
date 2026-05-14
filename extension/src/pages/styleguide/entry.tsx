import { render } from "solid-js/web";
// @ts-ignore — side-effect import of global styles
import "@src/styles/sharedMain.scss";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import Styleguide from "@src/shared/components/styleguide/Styleguide";

const root = document.getElementById("minded-6622");
if (!root) throw new Error("Cannot find #minded-6622 root element");

addWrapperClasses();
render(() => <Styleguide />, root);
