import { Result, useResults } from "@keybr/result";
import { resultFromJson, resultToJson } from "@keybr/result";
import { Button, ErrorAlert, Field, FieldList, Icon } from "@keybr/widget";
import { Trash2, Download, Upload } from "@keybr/widget";
import { useIntl } from "@keybr/intl";
import * as styles from "./FooterSection.module.css";

export function FooterSection() {
    const { formatMessage } = useIntl();
    let uploadInput: HTMLInputElement | undefined;
    const { handleDownloadData, handleUploadData, handleResetData } = useCommands();
    return (<>
      <input ref={el => uploadInput = el} type="file" accept="application/json,.json" hidden={true} onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file != null) {
                handleUploadData(file).catch((error) => {
                    ErrorAlert.report(error);
                });
            }
        }}/>
      <div class={styles.footer}>
        <FieldList>
          <Field>
            <Button size={16} icon={<Icon shape={Download}/>} label={formatMessage({
                id: "t_Download_data",
                defaultMessage: "Download data",
            })} title={formatMessage({
                id: "stats.download.description",
                defaultMessage: "Download all your typing data in JSON format.",
            })} onClick={handleDownloadData}/>
          </Field>
          <Field>
            <Button size={16} icon={<Icon shape={Upload}/>} label="Upload data" title="Merge typing data from a JSON export. Exact duplicate results are skipped." onClick={() => uploadInput?.click()}/>
          </Field>
          <Field.Filler />
          <Field>
            <Button size={16} icon={<Icon shape={Trash2}/>} label={formatMessage({
                id: "t_Reset_statistics",
                defaultMessage: "Reset statistics",
            })} title={formatMessage({
                id: "stats.reset.description",
                defaultMessage: "Permanently delete all of your typing data and reset statistics.",
            })} onClick={handleResetData}/>
          </Field>
        </FieldList>
      </div>
    </>);
}

function useCommands() {
    const { formatMessage } = useIntl();
    const { results, appendResults, clearResults } = useResults();
    return {
        handleDownloadData: () => {
            const json = JSON.stringify(results());
            const blob = new Blob([json], { type: "application/json" });
            download(blob, "typing-data.json");
        },
        handleUploadData: async (file: File) => {
            const json: unknown = JSON.parse(await file.text());
            if (!Array.isArray(json)) throw new Error("Invalid typing data: expected a JSON array.");
            const known = new Set(results().map(resultIdentity));
            const added: Result[] = [];
            let duplicateCount = 0;
            let invalidCount = 0;
            for (const value of json) {
                const result = resultFromJson(value);
                if (result == null || !Result.isValid(result)) { invalidCount += 1; continue; }
                const identity = resultIdentity(result);
                if (known.has(identity)) { duplicateCount += 1; continue; }
                known.add(identity);
                added.push(result);
            }
            if (added.length > 0) appendResults(added);
            const parts = [`Imported ${added.length} new result${added.length === 1 ? "" : "s"}.`];
            if (duplicateCount > 0) parts.push(`Skipped ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}.`);
            if (invalidCount > 0) parts.push(`Skipped ${invalidCount} invalid result${invalidCount === 1 ? "" : "s"}.`);
            window.alert(parts.join(" "));
        },
        handleResetData: () => {
            const message = formatMessage({
                id: "stats.reset.message",
                defaultMessage: "Are you sure you want to delete all data and reset your statistics? This operation is permanent and cannot be undone!",
            });
            if (window.confirm(message)) clearResults();
        },
    };
}
function resultIdentity(result: Result): string {
    const { ts, ...data } = resultToJson(result);
    return `${ts}\u0000${JSON.stringify(data)}`;
}
function download(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.setAttribute("href", URL.createObjectURL(blob));
    a.setAttribute("download", name);
    a.setAttribute("hidden", "");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
