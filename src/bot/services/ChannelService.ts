import { Chat, ChatFromGetChat } from 'telegraf/types';
import { bot } from '../Bot';

/**
 * Get a registered channel if the user is the owner
 * @param ownerID User ID of the owner
 * @param channelID Channel ID to check
 * @returns Channel object if registered, undefined otherwise
 */
export async function getRegisteredChannel(ownerID: number, channelID: number): Promise<Chat.GroupGetChat | Chat.SupergroupGetChat | Chat.ChannelGetChat | undefined> {
    try {
        const chat = await bot.telegram.getChat(channelID);
        const admins = await bot.telegram.getChatAdministrators(channelID);
        const ownerId = admins.find(x => x.status == 'creator')?.user.id;

        console.log("OWNER ID:", ownerId, " | channelID:", channelID);

        if (ownerId === ownerID) {
            const channel = convertChatToChannel(chat);
            return channel;
        } else {
            return undefined;
        }
    } catch (e) {
        console.log('Get Registered Channel Error:', e);
        return undefined;
    }
}

/**
 * Get channel invite link
 * @param channelID Channel ID
 * @returns Invite link or undefined
 */
export async function getChannelInviteLink(channelID: number) {
    try {
        const chat = await bot.telegram.getChat(channelID);

        if (chat) {
            const channel = convertChatToChannel(chat);
            return channel.invite_link;
        }
        return undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * Create a one-time channel invite link
 * @param channelID Channel ID
 * @param until Expiration timestamp
 * @param _name Name for the invite link
 * @returns Invite link object or undefined
 */
export async function getOneTimeChannelInviteLink(channelID: number, until: number, _name: string) {
    try {
        const chat = await bot.telegram.getChat(channelID);

        if (chat) {
            const oneTimeInvite = await bot.telegram.createChatInviteLink(channelID, { 
                creates_join_request: false, 
                expire_date: until, 
                member_limit: 1, 
                name: _name 
            });
            return oneTimeInvite;
        }

        return undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * Revoke a channel invite link
 * @param channelID Channel ID
 * @param inviteLink Invite link to revoke
 * @returns True if revoked, undefined on error
 */
export async function removeOneTimeChannelInviteLink(channelID: number, inviteLink: string) {
    try {
        const chat = await bot.telegram.getChat(channelID);

        if (chat) {
            const oneTimeInvite = await bot.telegram.revokeChatInviteLink(channelID, inviteLink);
            return oneTimeInvite.is_revoked;
        }

        return undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * Remove a user from a channel
 * @param channelId Channel ID
 * @param userId User ID to remove
 */
export async function removeUserFromChannel(channelId: number, userId: number) {
    try {
        const isUserInChannel = await checkUserInChannel(userId, channelId);
        console.log('isUserInChannel:', isUserInChannel);

        if (isUserInChannel) {
            const isUserKicked = await bot.telegram.banChatMember(channelId, userId);

            setTimeout(async () => {
                const isUnbanned = await bot.telegram.unbanChatMember(channelId, userId);
                console.log("Unban Chat Member:", isUnbanned);
            }, 1000);

            console.log("isUserKicked:", isUserKicked);
        }
    } catch (e) {
        console.log('Remove User From Channel Error:', e);
    }
}

/**
 * Check if a user is in a channel
 * @param userId User ID
 * @param channelId Channel ID
 * @returns True if user is in channel, false otherwise
 */
export async function checkUserInChannel(userId: number, channelId: number) {
    try {
        const res = await bot.telegram.getChatMember(channelId, userId);
        return res.status !== 'left'; // User is still in the channel if not 'left'
    } catch (err) {
        console.error(err.message);
        return false; // Assume user is not in the channel on error
    }
}

/**
 * Convert a chat to a channel type
 * @param chat Chat object
 * @returns Channel chat object
 */
export function convertChatToChannel(chat: ChatFromGetChat) {
    return chat as Chat.GroupGetChat | Chat.SupergroupGetChat | Chat.ChannelGetChat;
}

/**
 * Get the target chat based on type
 * @param targetChat Chat object
 * @returns Typed chat object or undefined
 */
export function getTargetChat(targetChat: Chat): Chat.ChannelChat | Chat.GroupChat | Chat.SupergroupChat | undefined {
    if (targetChat.type === 'channel') {
        return targetChat as Chat.ChannelChat;
    }

    if (targetChat.type === 'group') {
        return targetChat as Chat.GroupChat;
    }

    if (targetChat.type === 'supergroup') {
        return targetChat as Chat.SupergroupChat;
    }

    return undefined;
} 