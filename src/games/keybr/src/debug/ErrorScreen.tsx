import { Article } from "../widget/components/text/Article.tsx";
import { Header } from "../widget/components/text/Header.tsx";
import { Para } from "../widget/components/text/Para.tsx";
import { ErrorReport } from "./ErrorReport.tsx";

export function ErrorScreen(props: { readonly report: string }) {
  return (
    <Article>
      <Header level={1}>Error</Header>

      <Para>Oh no, something bad has happened!</Para>

      <ErrorReport report={props.report} />
    </Article>
  );
}
