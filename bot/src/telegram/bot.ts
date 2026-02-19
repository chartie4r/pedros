import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot: TelegramBot | null = null;

export function getTelegramBot(): TelegramBot {
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  if (!bot) {
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
}

export function startTelegramPolling(): void {
  const b = getTelegramBot();
  b.startPolling();

  b.on("message", async (msg: TelegramBot.Message) => {
    const text = msg.text?.trim() ?? "";
    const chatId = msg.chat.id;

    if (text === "/start") {
      await b.sendMessage(
        chatId,
        "Hi! I'm Pedros assistant. Commands: /ping, /status, /task <description>"
      );
      return;
    }

    if (text === "/ping") {
      await b.sendMessage(chatId, "pong");
      return;
    }

    if (text === "/status") {
      await b.sendMessage(chatId, "Bot is running. Use /task <description> to submit a task.");
      return;
    }

    if (text.startsWith("/task ")) {
      const description = text.slice(6).trim();
      if (!description) {
        await b.sendMessage(chatId, "Usage: /task <description>");
        return;
      }
      await b.sendMessage(chatId, `Task received: "${description}". Queued for processing.`);
      return;
    }

    if (text) {
      await b.sendMessage(
        chatId,
        "Unknown command. Try /start, /ping, /status, or /task <description>"
      );
    }
  });
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await getTelegramBot().sendMessage(chatId, text);
}
