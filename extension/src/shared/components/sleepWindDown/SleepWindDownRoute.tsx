import { JSX } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { SleepWindDownView } from "./SleepWindDownView";

export const SleepWindDownRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.preview === "1";

  // Preview is launched from settings ("Try wind-down now"). When the user
  // exits, return them where they came from rather than to the dashboard.
  const dismissTo = isPreview ? "/settings" : "/";

  return (
    <SleepWindDownView
      isPreview={isPreview}
      // The dismiss transition already faded this view's own wrapper out, so tell
      // the router-level page-fade interceptor (RouteCmp) to skip re-fading it —
      // otherwise it would flash the just-dismissed content back to full opacity
      // for a frame before fading again.
      onDismiss={() => navigate(dismissTo, { state: { skipPageFade: true } })}
    />
  );
};

export default SleepWindDownRoute;
