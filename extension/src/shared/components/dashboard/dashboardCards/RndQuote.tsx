import { JSX } from "solid-js";
// @ts-ignore
import styles from "@src/shared/components/dashboard/dashboardCards/RndQuote.module.scss";
import { getRndEntry } from "@src/util/getRndEntry";
import { QUOTES } from "@src/shared/data/quotes";

export const RndQuote: () => JSX.Element = () => {
  const quote = getRndEntry(QUOTES);
  return (
    <div class={styles.RndQuote}>
      <div class="userQuote">“{quote.txt}”</div>
      {quote.author && <div class={styles.author}>{quote.author}</div>}
    </div>
  );
};
