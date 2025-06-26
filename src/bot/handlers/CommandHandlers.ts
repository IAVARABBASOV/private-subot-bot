import { Context, NarrowedContext } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import * as templateMessageManager from '../BotTemplateMessages';
import * as confirmationManager from '../BotConfirmationMessage';
import * as commandManager from '../BotCommandManager';
import * as databaseManager from '../../db/databasemanager';
import { bot } from '../Bot';
import { getRegisteredChannel } from '../services/ChannelService';
import { getTimeInStringFormat } from '../utils/TimeUtils';

/**
 * Handle the /time command
 * @param ctx Command context
 */
export async function handleTimeCommand(ctx: Context) {
    const time = new Date(Date.now());
    const expiredTime = time.getRoundedNextTime(60 * 1000);

    await ctx.reply(`-\n
    - Time: ${getTimeInStringFormat(time.getTime())}\n
    - Expired Time: ${getTimeInStringFormat(expiredTime * 1000)}\n-`);
}

/**
 * Handle the /deletealldata command (owner only)
 * @param ctx Command context
 * @param ownerUserId Owner user ID
 */
export async function handleDeleteAllDataCommand(ctx: Context, ownerUserId: number) {
    try {
        if (ctx.chat?.id === ownerUserId) {
            await confirmationManager.sendAgreementMessage(
                ctx.chat.id,
                "Are you sure you want to delete all data? This action cannot be undone.",
                'HTML',
                async () => {
                    await databaseManager.deleteAllDB();
                    await ctx.reply("All data has been deleted.");
                },
                async () => {
                    await ctx.reply("Data deletion cancelled.");
                }
            );
        }
    } catch (e) {
        console.log("deleteAllData ERROR:", e);
    }
}

/**
 * Handle the /getalldata command (owner only)
 * @param ctx Command context
 * @param ownerUserId Owner user ID
 */
export async function handleGetAllDataCommand(ctx: Context, ownerUserId: number) {
    if (ctx.chat?.type === 'private' && ctx.chat.id === ownerUserId) {
        const allDataAsText = await databaseManager.getAllData();
        await ctx.reply(allDataAsText);
    }
}

/**
 * Handle the /leave command
 * @param ctx Command context
 * @param text Command text
 * @param chatId Chat ID
 */
export async function handleLeaveChatCommand(
    ctx: NarrowedContext<Context<Update>, Update.MessageUpdate<Message>>, 
    text: string, 
    chatId: number
) {
    try {
        // Extract channel ID from command
        let channelId = -commandManager.getNumberFromCommand(text);
        const registeredChannel = await getRegisteredChannel(chatId, channelId);

        if (channelId !== 0 && registeredChannel) {
            await templateMessageManager.tryDeleteMessages(ctx.chat.id, ctx.message.message_id, 0, 5);

            await confirmationManager.sendAgreementMessage(
                chatId,
                `Do you want to Unregister ❌ the <a href="${registeredChannel.invite_link}">${registeredChannel.title} ?</a>`,
                'HTML',
                async () => await bot.telegram.leaveChat(channelId),
                async () => {
                    const channelData = await databaseManager.getChannelData(channelId);
                    const ownerData = await databaseManager.getUserData(channelData.ownerId);
                    await templateMessageManager.sendChannelRegisteredMessage(
                        ownerData, 
                        channelData, 
                        registeredChannel.invite_link
                    );
                }
            );
        }
    } catch (e) {
        console.log("error:", e);
        const message = await bot.telegram.sendMessage(chatId, e);
        await bot.telegram.deleteMessage(chatId, message.message_id - 1);
    }
}

/**
 * Handle the /get command for channel links
 * @param ctx Command context
 * @param text Command text
 * @param chatId Chat ID
 */
export async function handleGetChannelLinkCommand(ctx: Context, text: string, chatId: number) {
    try {
        let channelId = -commandManager.getNumberFromCommand(text);
        const registeredChannel = await getRegisteredChannel(chatId, channelId);
        const channelData = await databaseManager.getChannelData(channelId);

        if (channelId !== 0 && registeredChannel) {
            await templateMessageManager.tryDeleteMessages(ctx.chat?.id, (ctx.message as Message).message_id, 0, 5);
            await templateMessageManager.sendChannelInviteLink(chatId, registeredChannel, channelData);
        }
    } catch (e) {
        console.log("error:", e);
        const message = await bot.telegram.sendMessage(chatId, e);
        await bot.telegram.deleteMessage(chatId, message.message_id - 1);
    }
} 