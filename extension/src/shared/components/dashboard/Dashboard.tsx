import { JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { useNavigate } from "@solidjs/router";
import { navigateWithPageFadeOut } from "@src/util/animation";

// `forceRevealed` renders the full grid directly (the /lookBack route) instead
// of the calm single-card greeting — see DashboardGroups.
export const Dashboard: (props: { forceRevealed?: boolean }) => JSX.Element = (
  props,
) => {
  const navigate = useNavigate();

  // Fade the dashboard fully out before opening the category page, so the
  // surfaces never hard-cut into each other (the page eases in via its own
  // pageTransitionIn) — see the "transitions — always soft" styling rule.
  const goToCategoryPage = (id: string) => {
    navigateWithPageFadeOut(navigate, `/questionCategory/${id}`);
  };
  return (
    <DashboardGroups
      forceRevealed={props.forceRevealed}
      onQuestionCategorySelect={(id) => goToCategoryPage(id)}
    />
  );
};
