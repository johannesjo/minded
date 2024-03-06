import { JSX } from "solid-js";
import styles from "./RndQuote.module.scss";
import { getRndEntry } from "@src/util/getRndEntry";
import { QUOTES } from "@src/shared/data/quotes";

export const RndQuote: () => JSX.Element = () => {
  const quote = getRndEntry(QUOTES);
  return (
    <div class={styles.RndQuote}>
      {!quote.author && <div class={styles.tipH}>Tip:</div>}
      <div class={styles.txt}>“{quote.txt}”</div>
      {quote.author && <div class={styles.author}>{quote.author}</div>}
    </div>
  );
};
