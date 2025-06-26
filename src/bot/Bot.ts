import { Telegraf } from 'telegraf';
import * as templateMessageManager from './BotTemplateMessages';
import * as commandManager from './BotCommandManager';
import dotenv from "dotenv";
import '../utils/timeExtension';
import { handleTimeCommand, handleDeleteAllDataCommand, handleGetAllDataCommand } from './handlers/CommandHandlers';
import { handleMessageEvent, handleMyChatMemberEvent } from './handlers/EventHandlers';
import * as commandList from './CmdList';

dotenv.config();

export const ownerUserId: number = parseInt(process.env.OWNER_ID!!);
const TOKEN: string | undefined = process.env.BOT_TOKEN;

export const bot = new Telegraf(TOKEN!!);

// Launch the bot
bot.launch();

// Command to reset my commands
bot.command(commandList.resetCommands, async (ctx) => { 
    await commandManager.resetMyCommands(ctx.chat.id); 
});

// Command to delete all data (owner only)
bot.command(commandList.deleteAllDataCommand, async (ctx) => {
    await handleDeleteAllDataCommand(ctx, ownerUserId);
});

// Command to get the current time and expired time
bot.command(commandList.timeCommand, handleTimeCommand);

// Command to get all data (owner only)
bot.command(commandList.getAllDataCommand, async (ctx) => {
    await handleGetAllDataCommand(ctx, ownerUserId);
});

// Command to send the start message
bot.start(async (ctx) => await templateMessageManager.sendStartMessage(ctx));

// Command to send the register message
bot.command(commandList.registerCommand, async (ctx) => await templateMessageManager.sendRegisterMessage(ctx));

// Command to test (delete message)
bot.command(commandList.testCommand, async (ctx) => {
    await bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
});

// Handle incoming messages
bot.on('message', handleMessageEvent);

// Handle bot being added or removed from a chat
bot.on('my_chat_member', handleMyChatMemberEvent);

bot.on('new_chat_members', (ctx) => {
    console.log("new_chat_members");
     ctx.message.new_chat_members.forEach(async (member) => {
        await ctx.reply(`Welcome, ${member.first_name}! 🎉`);
    });
});

bot.on('left_chat_member', async (ctx) => {
    console.log("left_chat_member");
    await ctx.reply(`${ctx.message.left_chat_member.first_name} has left the group. 👋`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));