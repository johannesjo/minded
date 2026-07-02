import { JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { useNavigate } from "@solidjs/router";

// `forceRevealed` renders the full grid directly (the /lookBack route) instead
// of the calm single-card greeting — see DashboardGroups.
export const Dashboard: (props: { forceRevealed?: boolean }) => JSX.Element = (
  props,
) => {
  const navigate = useNavigate();

  // The page-to-page fade is handled globally by the router interceptor in
  // RouteCmp (`useBeforeLeave`), so a plain navigate eases the surfaces across —
  // no per-call wrapping needed. See the "transitions — always soft" rule.
  const goToCategoryPage = (id: string) => {
    navigate(`/questionCategory/${id}`);
  };
  return (
    <DashboardGroups
      forceRevealed={props.forceRevealed}
      onQuestionCategorySelect={(id) => goToCategoryPage(id)}
    />
  );
};
