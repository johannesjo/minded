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
      onDismiss={() => navigate(dismissTo)}
    />
  );
};

export default SleepWindDownRoute;
