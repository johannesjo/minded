import { createSignal, onMount } from "solid-js";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingWeb } from "@pages/newtab/components/onboardingWeb/OnboardingWeb";
import RoutesCmp from "@src/shared/RouteCmp";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { resolveInitialOnboardingVisibility } from "./newTabInitialState";

const NewTab = () => {
  const [getHasLoaded, setHasLoaded] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  onMount(() => {
    // Apply the living sky before either first-run onboarding or the route shell
    // takes ownership. RoutesCmp repeats this idempotently when it mounts.
    addWrapperClasses();
    void (async () => {
      try {
        setIsShowOnboarding(
          await resolveInitialOnboardingVisibility(getSyncData),
        );
      } finally {
        // Preserve the old fallback: a failed read must not strand the new tab
        // on an empty loading sky. The route shell owns normal error handling.
        setHasLoaded(true);
      }
    })();
  });

  // Keep the pre-painted loading sky in place until storage resolves. Mounting
  // RoutesCmp first would briefly show its companion sun before replacing it
  // with onboarding's sun, breaking the one-sun entrance.
  return (
    <>
      {!getHasLoaded() ? (
        <div id="minded-6622-coloured-wrapper" aria-busy="true" />
      ) : getIsShowOnboarding() ? (
        <div id="minded-6622-coloured-wrapper">
          <OnboardingWeb onComplete={() => setIsShowOnboarding(false)} />
        </div>
      ) : (
        <RoutesCmp />
      )}
    </>
  );
};

export default NewTab;
