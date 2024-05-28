import { ChartData } from "chart.js";
import { APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/appUsageOrBrowsingBehavior.const";

export const getAppUsageOrBrowsingBehaviorChartData = (data: {
  [key: string]: number;
}): ChartData => {
  const values = Object.values(data);
  const dates = Object.keys(data).map((date) => date.substring(5));
  // console.log(data);

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
    yLabels: APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS.map((opt) => opt.txt),
    // yLabels: [1, 2, 3, 4, 5],
    xLabels: dates,
  };
};
