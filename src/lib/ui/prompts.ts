import { confirm, input, select } from '@inquirer/prompts';

export const promptYesNo = async (
  question: string,
  defaultValue: boolean
): Promise<boolean> => confirm({ message: question, default: defaultValue });

export const promptInput = async (
  question: string,
  defaultValue?: string
): Promise<string> => input({ message: question, default: defaultValue });

export const selectFromList = async (
  message: string,
  items: string[]
): Promise<string> =>
  select({
    message,
    choices: items.map((item) => ({ name: item, value: item })),
  });
