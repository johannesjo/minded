import { JSX } from "solid-js";
// @ts-ignore
import styles from "@src/shared/components/dashboard/dashboardCards/RndQuote.module.scss";
import { getGreetingQuote } from "@src/shared/components/dashboard/greetingMemory";

export const RndQuote: () => JSX.Element = () => {
  // Drawn at random, then held for as long as this greeting stands (see
  // greetingMemory): a quote card that re-randomised on every mount would
  // change its words each time the user came back to the dashboard, even
  // though the greeting itself never changed.
  const quote = getGreetingQuote();
  return (
    <div class={styles.RndQuote}>
      <div class="dashboardContent">“{quote.txt}”</div>
      {quote.author && <div class={styles.author}>{quote.author}</div>}
    </div>
  );
};
