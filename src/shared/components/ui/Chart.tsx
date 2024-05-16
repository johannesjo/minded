import { createSignal, onMount } from "solid-js";
import { Line } from "solid-chartjs";
import { createStore } from "solid-js/store";
import { Chart as ChartJSChart, ChartData } from "chart.js";
import { BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/browsing-behavior-rating/browsingBehaviorRating.const";

function Chart(props: { chartData: ChartData }) {
  onMount(() => {
    const style = getComputedStyle(document.getElementById("minded-6622"));
    const primCol = style.getPropertyValue("--c-graph-fg-full");
    const mutedColor = style.getPropertyValue("--c-graph-fg-less");
    ChartJSChart.defaults.backgroundColor = "transparent";
    ChartJSChart.defaults.borderColor = mutedColor;
    ChartJSChart.defaults.color = primCol;
  });

  const [chartData] = createSignal<ChartData>(props.chartData);
  const [chartConfig] = createStore({
    width: 400,
    height: 300,
  });

  const fallback = () => {
    return (
      <div>
        <p>Chart is not available</p>
      </div>
    );
  };

  return (
    <div>
      <div>
        <Line
          width={chartConfig.width}
          height={chartConfig.height}
          fallback={fallback()}
          data={chartData()}
          options={{
            responsive: true,
            scales: {
              y: {
                // beginAtZero: true,
                min: 1,
                ticks: {
                  callback: function (value, index, values) {
                    // Replace this with your custom logic
                    return BROWSING_BEHAVIOR_OPTIONS.find(
                      (opt) => opt.val === value,
                    )?.txt;
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export default Chart;
