import { Context, NarrowedContext } from 'telegraf';
import { BotCommand, Message, Update } from 'telegraf/types';
import * as channelManager from '../BotChannelManager';
import * as commandManager from '../BotCommandManager';
import { bot } from '../Bot';
import { getTargetChat, getRegisteredChannel } from '../services/ChannelService';
import { handleLeaveChatCommand, handleGetChannelLinkCommand } from './CommandHandlers';

/**
 * Handle message events
 * @param ctx Message context
 */
export async function handleMessageEvent(ctx: NarrowedContext<Context<Update>, Update.MessageUpdate<Message.TextMessage>>) {
    try {
        if (ctx.chat?.type === 'private' && ctx.message.text) {
            if (ctx.message.text.includes('/leave')) {
                await handleLeaveChatCommand(ctx, ctx.message.text, ctx.chat.id);
            }

            if (ctx.message.text.includes('/get')) {
                await handleGetChannelLinkCommand(ctx, ctx.message.text, ctx.chat.id);
            }
        }
    } catch (e) {
        console.log("ERROR OCCURRED:", e);
    }
}

/**
 * Handle my_chat_member events (bot added/removed from chats)
 * @param ctx Chat member context
 */
export async function handleMyChatMemberEvent(ctx: NarrowedContext<Context<Update>, Update.MyChatMemberUpdate>) {
    const myChatMember = ctx.update.my_chat_member;

    // Bot Added to Chat as an Administrator
    if (myChatMember.new_chat_member.status === 'administrator') {
        if (!myChatMember.from.is_bot) {
            const targetChat = getTargetChat(myChatMember.chat);

            if (targetChat !== undefined) {
                // Add channel to existing user
                setTimeout(async () => {
                    const channel = await getRegisteredChannel(myChatMember.from.id, targetChat.id);
                    await channelManager.addNewChannel(myChatMember.from, channel);

                    const channelId = targetChat.id.toString().replace('-', '');
                    const cmdLeave = `leave${channelId}`;
                    const cmdGet = `get${channelId}`;

                    const commands: BotCommand[] = [];
                    commands.push({
                        command: cmdLeave,
                        description: `Leave the ${targetChat.title}`
                    });

                    commands.push({
                        command: cmdGet,
                        description: `Subscription Link of the ${targetChat.title}`
                    });

                    await commandManager.addMyCommands(myChatMember.from.id, commands);
                }, 1500); // Delay in milliseconds
            }
        }
    }

    // Bot removed from chat
    if (myChatMember.old_chat_member.status === 'administrator') {
        const targetChat = getTargetChat(myChatMember.chat);

        if (targetChat !== undefined) {
            const userId = await channelManager.removeChannel(targetChat.id);

            if (userId !== -1) {
                const channelId = targetChat.id.toString().replace('-', '');
                const cmdLeave = `leave${channelId}`;
                const cmdGet = `get${channelId}`;

                const commands: string[] = [];
                commands.push(cmdLeave);
                commands.push(cmdGet);

                try {
                    await commandManager.removeMyCommands(userId, commands);
                }catch (e) {
                    console.log("Error removing commands:", e);
                }
            }
        }
    }
} 