/**
 * A slash command: the name the user types after a slash, what it does, and
 * the work it does when it runs.
 *
 * A command runs in the client. It never reaches the agent, so it costs no
 * model turn and answers at once.
 */
export interface SlashCommand {
  /** The name, without the leading slash. */
  name: string;
  /** What the command does, shown in the menu. */
  description: string;
  /** The argument the command takes, shown after the name in the menu. */
  argument?: string;
  /**
   * Runs the command and returns the lines it printed. The lines are shown in
   * the conversation, so a command answers without a model turn.
   */
  run: (args: string) => Promise<string[]>;
}

/**
 * A draft that starts a command, split into the name and the argument that
 * follows it.
 */
export interface SlashDraft {
  /** The name of the command, without the slash. */
  name: string;
  /** The argument after the name. */
  args: string;
}

/**
 * Splits a draft into a command name and its argument.
 *
 * Returns null when the draft does not start a command.
 */
export function parseSlashDraft(draft: string): SlashDraft | null {
  if (!draft.startsWith("/")) {
    return null;
  }

  const body = draft.slice(1);
  const space = body.indexOf(" ");

  if (space === -1) {
    return { name: body, args: "" };
  }

  return { name: body.slice(0, space), args: body.slice(space + 1).trim() };
}

/**
 * How well a command matches a typed name. Lower is better, and a negative
 * score means the command does not match at all.
 *
 * Only the name counts. A description that happens to contain the typed text
 * is not a match, because a slash command the user did not name should not
 * run by accident.
 */
function scoreCommand(command: SlashCommand, query: string): number {
  const name = command.name.toLowerCase();

  if (name === query) {
    return 0;
  }

  if (name.startsWith(query)) {
    return 1;
  }

  if (name.includes(query)) {
    return 2;
  }

  return -1;
}

/**
 * The commands that match a typed name, the best match first.
 *
 * An empty name matches every command, which is what the menu shows right
 * after the slash.
 */
export function matchSlashCommands(
  commands: SlashCommand[],
  name: string,
): SlashCommand[] {
  const query = name.toLowerCase().trim();

  if (!query) {
    return [...commands];
  }

  return commands
    .map((command) => ({ command, score: scoreCommand(command, query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.command);
}

/** The line that describes a command in the help output. */
export function describeSlashCommand(command: SlashCommand): string {
  const usage = command.argument
    ? `/${command.name} ${command.argument}`
    : `/${command.name}`;

  return `${usage} — ${command.description}`;
}
