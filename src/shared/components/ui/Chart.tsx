import { createSignal } from "solid-js";
import { Line } from "solid-chartjs";
import { createStore } from "solid-js/store";
import { ChartData } from "chart.js";
import { BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/browsing-behavior-rating/browsingBehaviorRating.const";

function Chart(props: { chartData: ChartData }) {
  const [chartData] = createSignal<ChartData>(props.chartData);
  const [chartConfig] = createStore({
    width: 400,
    height: 200,
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
            maintainAspectRatio: false,
            scales: {
              y: {
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
