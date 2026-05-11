import { createSignal, onMount } from "solid-js";
import { Line } from "solid-chartjs";
import { createStore } from "solid-js/store";
import { Chart as ChartJSChart, ChartData } from "chart.js";
import { APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/appUsageOrBrowsingBehavior.const";

function Chart(props: { chartData: ChartData }) {
  let chartEl: HTMLDivElement | undefined;

  onMount(() => {
    const element =
      (chartEl?.closest("#minded-6622") as HTMLElement | null) ??
      document.getElementById("minded-6622");
    if (!element) return;
    const style = getComputedStyle(element);
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
    <div ref={chartEl}>
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
                  callback: function (value: string | number) {
                    // Replace this with your custom logic
                    return APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS.find(
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
