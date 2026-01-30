import { TOTAL_STEPS } from "../cli/constants.js";
import { emoji, styles, tag } from "./format.js";

export const logInfo = (message: string): void => {
  console.log(`${emoji.info} ${tag("INFO", styles.cyan)} ${message}`);
};

export const logSuccess = (message: string): void => {
  console.log(`${emoji.success} ${tag("OK", styles.green)} ${message}`);
};

export const logWarn = (message: string): void => {
  console.log(`${emoji.warn} ${tag("WARN", styles.yellow)} ${message}`);
};

export const logError = (message: string): void => {
  console.error(`${emoji.error} ${tag("ERROR", styles.red)} ${message}`);
};

export const printHeader = (): void => {
  console.log(styles.bold(`${emoji.header} gh-ssh`));
  console.log(styles.dim(`${emoji.subtitle} GitHub SSH key setup`));
  console.log(styles.dim("----------------------------------------"));
};

export const printStep = (
  index: number,
  title: string,
  icon = emoji.step,
): void => {
  console.log("");
  console.log(
    `${icon} ${styles.cyan(`Step ${index}/${TOTAL_STEPS}`)} ${styles.bold(title)}`,
  );
};

export const printList = (items: string[]): void => {
  items.forEach((item) => {
    console.log(`  ${emoji.list} ${item}`);
  });
};

export const waitForNextStep = async (delayMs = 500): Promise<void> => {
  console.log(styles.dim(`${emoji.loading} Loading next step...`));
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};
