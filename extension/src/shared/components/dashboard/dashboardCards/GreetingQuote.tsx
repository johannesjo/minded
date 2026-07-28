import { JSX } from "solid-js";
// @ts-ignore
import styles from "@src/shared/components/dashboard/dashboardCards/GreetingQuote.module.scss";
import { getGreetingQuote } from "@src/shared/components/dashboard/greetingMemory";

// The quote card - drawn at random once, then held for as long as this greeting
// stands (see greetingMemory). It re-drew on every mount when it was RndQuote,
// which changed the words each time the user came back to the dashboard even
// though the greeting itself hadn't changed. The "look back" grid renders this
// same card, so it shows the greeting's words there too - one quote, one voice.
export const GreetingQuote: () => JSX.Element = () => {
  const quote = getGreetingQuote();
  return (
    <div class={styles.GreetingQuote}>
      <div class="dashboardContent">“{quote.txt}”</div>
      {quote.author && <div class={styles.author}>{quote.author}</div>}
    </div>
  );
};
