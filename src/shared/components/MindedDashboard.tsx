import { createSignal, JSX, onMount } from "solid-js";
import "./MindedDashboard.scss";
import { getSyncData } from '@src/shared/data/dataInterface';
import { Answer } from '@src/shared/data/sync-data';
import { groupBy } from '@src/util/groupBy';
import { Question, QuestionCategoryId, QUESTIONS } from '@src/shared/data/questions';


interface DashboardGroup {
  id: QuestionCategoryId;
  question: Question;
  answers: Answer[];
}

const dashboardEntriesFromQuestions = (answers: Answer[]): DashboardGroup[] => {
  const entries = groupBy(answers, (q) => q.questionId);
  const dashboardGroups = [];
  for (let categoryId in entries) {
    const answersForCat = entries[categoryId];

    if(answersForCat?.length) {
      const questionForCategory = QUESTIONS.find(qu => qu.category === categoryId);
      dashboardGroups.push({
        id: categoryId,
        question: questionForCategory,
        answers: answersForCat,
      });
    }
  }

  return dashboardGroups;
};


export const MindedDashboard: () => JSX.Element = () => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<DashboardGroup[]>([]);

  onMount(() => {
    getSyncData().then(syncData => {
      if(syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        console.log(entries);

        setDashboardGroups(entries);
      }
    });
  });


  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div className="box-wrapper">
          {getDashboardGroups().map(dg => (<div className="box">
            <div className="category-title"
                 title="Show all">{dg.question.txtDashboard || dg.question.txt}
            </div>
            {dg.answers.map(dga =>
              <div className="user-quote">{dga.val}</div>)
            }
          </div>))
          }
        </div>
      </div>
    </>
  );
};
