import { Chat, InlineKeyboardButton, InputFile, Message, ParseMode, Update } from "telegraf/types";
import { IChannel, IData } from "./types";
import { bot } from "./Bot";
import { Context, NarrowedContext } from "telegraf";
import dotenv from "dotenv";
import * as commandList from "./CmdList";
dotenv.config();

const adminPanelLink = process.env.ADMIN_DASHBOARD;
const subscriberPanelLink = process.env.SUBSCRIBER_DASHBOARD;

const groupInviteDeepLink = 'https://t.me/private_subot?startgroup&admin=invite_users+restrict_members+pin_messages+delete_messages';
const channelInviteDeepLink = 'https://t.me/private_subot?startchannel&admin=invite_users+restrict_members+pin_messages+delete_messages';

export async function sendStartMessage(ctx: Context<{
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
}>) {

    try {
        if(ctx.chat.type === 'private')
        {
            await tryDeleteMessages(ctx.chat.id, ctx.message.message_id, 0, 10);

            const message = `Hello, ${ctx.from.first_name}. If you want to Register your Channel please send /${commandList.registerCommand} command to me.\nChoose and open one of the specified Mini App Below:\n - Open Admin Dashboard for Manage your own Channels\n - Open Subscriber Dashboard for manage your Subscribed Channels`;
            const buttons: InlineKeyboardButton[] = [];
        
            buttons.push({
                text: 'Admin Dashboard',
                web_app: { url: adminPanelLink },
            });
        
            buttons.push({
                text: 'Subscribe Dashboard',
                web_app: { url: subscriberPanelLink },
            });
        
            const inlineKeyboardButtons: InlineKeyboardButton[][] = createInlineKeyboardButtons(buttons);

            await bot.telegram.sendChatAction(ctx.chat.id, 'typing');

            await ctx.reply(message, { reply_markup: { inline_keyboard: inlineKeyboardButtons }} );
        }
        else
        {
            await tryDeleteBOTMessage(ctx, 500);
        }
    }catch(e){
        console.log('Error on Start Message Send:', e);
    }
}

export async function sendRegisterMessage(ctx: Context<{
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
}>) 
{
    try {

        await bot.telegram.sendChatAction(ctx.chat.id, 'typing');
        await tryDeleteMessages(ctx.chat.id, ctx.message.message_id, 0, 10);

        if(ctx.chat.type === 'private')
        {   
            const message = "Add me to your Channel or Group and Give Admin Permission to manage your Subscribers";
            
            const buttons: InlineKeyboardButton[] = [];
            buttons.push({ text: 'Add me to Group', url: groupInviteDeepLink });
            buttons.push({ text: 'Add me to Channel', url: channelInviteDeepLink });
        
            const inlineKeyboardButtons: InlineKeyboardButton[][] = createInlineKeyboardButtons(buttons);
        
            await ctx.reply(message, { reply_markup: { inline_keyboard: inlineKeyboardButtons }} );
        }
        else
        {
            await tryDeleteBOTMessage(ctx, 500);
        }
    }
    catch(e){
        console.log('Error on Register Message Send:', e);
    }
}

async function tryDeleteBOTMessage(ctx: Context<{
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
}>, duration: number) 
{
    const messageID = ctx.message.message_id;

    setTimeout(async () => {

        try {
            console.log("DELETE MESSAGE:", messageID);
            await ctx.deleteMessage(messageID);
        }catch(e){
            console.log(`MESSAGE ${messageID} NOT DELETED in ${ctx.chat.type}`);
        }

    }, duration);
}

export async function tryDeleteMessages(chatId: number, messageId: number, startIndex: number, messageCount: number) {
    try {
        for (let i = startIndex; i < messageCount; i++) {
            await bot.telegram.deleteMessage(chatId, messageId - i);            
        }
    }catch(e){ }
}

export async function sendChannelRegisteredMessage(owner: IData, targetChat: IChannel, channelLink: string){

    try{ 
        const channelType = '`'+targetChat.type+'`';
        const channelName = `*[${targetChat.title}](${channelLink})*`;
        const kickMessage = `*Kick Me* from your ${targetChat.type} or just use this command in this chat: /${commandList.leaveChatCommand}${targetChat.id.toString().replace('-','')}`;

        const message = `Your ${channelType} ${channelName} has been *Registered Success* ✅\n\n||If you want to ❌ Remove this ${targetChat.type}, just ${kickMessage}||`;
    
        await sendMessageTo(owner.id, message, 'MarkdownV2');
    }catch(e) {
        console.log('Error on Channel Register Message Send:', e);
    }
}

export async function sendChannelInviteLink(
    userId: number,
    targetChannel: Chat.GroupGetChat | Chat.SupergroupGetChat | Chat.ChannelGetChat,
    channelData: IChannel
) {
    let inviteSubscriberLink = `<a href="${channelData.inviteLink}">Click Here to Subscribe ${targetChannel.title}</a>`;
    const description = targetChannel?.description;

    let plans = '\n<b>Subscription Plans:</b>\n';

    channelData.subscriptionPlans.forEach(plan => {
        plans += `\n<b>${plan.name}</b>\n${plan.description}\n<b>💸 Price: ${plan.price} TON💎</b> \t\t<b>📆 Duration: ${plan.duration} Days</b>\n`;
    });

    const channelName = `<b>${targetChannel.title}</b>`;

    // expandable
    let caption = description ? `${channelName}\n<blockquote expandable>${description}</blockquote>` : `${channelName}\n${inviteSubscriberLink}`;

    caption += `<blockquote expandable>${plans}\n&#x2063;</blockquote>`;

    const channelPhoto = targetChannel.photo?.big_file_id;

    try {
        if (channelPhoto) {
            // Download the file URL from Telegram servers
            const fileLink = await bot.telegram.getFileLink(channelPhoto);

            const subscriberAppOpenButton = {
                inline_keyboard: [
                    [
                        {
                            text: `Subscribe to: ${targetChannel.title}`,
                            url: channelData.inviteLink
                        }
                    ]
                ]
            };

            // Send the photo to the user
            return await bot.telegram.sendPhoto(userId, { url: fileLink.href } as InputFile, {
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: subscriberAppOpenButton
            });
        } else {
            // Fallback: send a message if no photo exists
           return await bot.telegram.sendMessage(userId, caption, { parse_mode: 'HTML' });
        }
    } catch (error) {
        console.error("Failed to send invite link:", error);
        return undefined;
    }
}

export async function sendChannelUnregisteredMessage(owner: IData, targetChat: IChannel){

    try {
        const channelType = '`'+targetChat.type+'`';
        const message = `Your ${channelType} *${targetChat.title}* has been *Unregistered* ❌\n\nClick to /register if you want to register new Channel`;
    
        await sendMessageTo(owner.id, message, 'MarkdownV2');
    
    }catch(e){
        console.log('Error on Channel Unregistered Message Send:', e);
    }
}

async function sendMessageTo(id: number, msg: string, parseMode: ParseMode)
{
    await bot.telegram.sendChatAction(id, 'typing');

    const buttons: InlineKeyboardButton[] = [];
    
    buttons.push({
        text: 'Admin Dashboard',
        web_app: { url: adminPanelLink },
    });
    const inlineKeyboardButtons: InlineKeyboardButton[][] = createInlineKeyboardButtons(buttons);

    const newMessage = await bot.telegram.sendMessage(id, msg, { parse_mode: parseMode });

    await tryDeleteMessages(id, newMessage.message_id, 1, 5);
    
    await bot.telegram.sendMessage(id, "Check out the Admin Dashboard", {reply_markup: { inline_keyboard: inlineKeyboardButtons }});
}

export function createInlineKeyboardButtons(buttons: InlineKeyboardButton[]) : InlineKeyboardButton[][]
{
    const inlineKeyboardButtons: InlineKeyboardButton[][] = [];

    inlineKeyboardButtons.push(buttons); 

    return inlineKeyboardButtons;
}

// Send Subscription End Message to Member
export async function trySendSubscriptionEndMessageToUser(userId: number, channelData: IChannel){

    try{
        const inviteSubscriberLink = `*[Click here to Subscribe Again](${channelData.inviteLink})*`;
        const message = `Your Subscription Plan has been end\nOn ${channelData.type} ${channelData.title}\n${inviteSubscriberLink}`;

        await bot.telegram.sendMessage(userId, message, { parse_mode: 'MarkdownV2' });

    }catch(e){
        console.log('Error on Send Subscription End Message:', e);
    }
}