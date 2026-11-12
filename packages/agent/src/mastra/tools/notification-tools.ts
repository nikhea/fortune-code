import {
  createNotificationInboxTool,
  InMemoryNotificationsStorage,
} from "@mastra/core/notifications";
import type { Tool } from "@mastra/core/tools";

/**
 * Where notifications live. The inbox tool and anything that raises a
 * notification share this store, so the agent sees what the app sent.
 */
export const notificationsStorage = new InMemoryNotificationsStorage();

/**
 * The built-in inbox tool is registered as `notification-inbox`. The tool set
 * uses snake_case names, so it is renamed in place.
 */
export const notificationInboxTool = Object.assign(
  createNotificationInboxTool({ storage: notificationsStorage }),
  { id: "notification_inbox" },
) as Tool<any, any>;
