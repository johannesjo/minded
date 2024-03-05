import { JSX } from "solid-js";
import "./MindedDashboard.scss"
export const MindedDashboard: () => JSX.Element = () => {
  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div className="box-wrapper">
          <div className="box">
            <div className="category-title" title="Show all">What is good today</div>
            <div className="user-quote">The sun is shining</div>
          </div>
        </div>
      </div>
    </>
  );
};
