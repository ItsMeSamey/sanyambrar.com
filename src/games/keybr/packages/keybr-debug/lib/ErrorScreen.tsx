import { Article, Header, Para } from "@keybr/widget";
import { ErrorReport } from "./ErrorReport.tsx";

export function ErrorScreen(solidProps: { readonly report: string }) {
  return (
    <Article>
      <Header level={1}>Error</Header>

      <Para>Oh no, something bad has happened!</Para>

      <ErrorReport report={solidProps.report} />
    </Article>
  );
}
