import { ChartData } from "chart.js";
import { BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/browsing-behavior-rating/browsingBehaviorRating.const";

export const getBrowsingBehaviorChartData = (data: {
  [key: string]: number;
}): ChartData => {
  const values = Object.values(data);
  const dates = Object.keys(data);
  console.log(data);

  return {
    datasets: [
      {
        data: values,
        borderWidth: 2,
        // pointStyle: "circle",
        // pointRadius: 10,
        // pointHoverRadius: 15,
      },
    ],

    // yLabels: [1, 2, 3, 4, 5],
    yLabels: BROWSING_BEHAVIOR_OPTIONS.map((opt) => opt.txt),
    // yLabels: [1, 2, 3, 4, 5],
    xLabels: dates,
  };
};
