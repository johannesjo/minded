import { JSX } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { SleepWindDownView } from "./SleepWindDownView";

export const SleepWindDownRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.preview === "1";

  return (
    <SleepWindDownView isPreview={isPreview} onDismiss={() => navigate("/")} />
  );
};

export default SleepWindDownRoute;
