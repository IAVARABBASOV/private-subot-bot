import * as databaseManager from '../db/databasemanager';
import * as userManager from './BotUserManager';
import * as messageTemplate from "./BotTemplateMessages";
import * as cipher from '../cipherology/cipher';
import { Chat, User } from 'telegraf/types';
import { IChannel, SubscriptionPlan } from './types';

export function getWebAppLink(channelId: number)
{
    const hash = cipher.encodeNumber(channelId);

    return `${process.env.SUBSCRIBER_MINI_APP}?startapp=${hash}`;
}

export function getChannelIdFromHash(hash: string){
    const channelId = cipher.decodeNumber(hash);

    return channelId;
}

export async function addNewChannel(user: User, targetChannel: Chat.GroupGetChat | Chat.SupergroupGetChat | Chat.ChannelGetChat) 
{
    try{
        // Get or Create UserData in DB
        let userData = await userManager.getOrCreateUserData(user);

        // User Data Exist or Created new one
        if(userData !== undefined)
        {
            // Create Channel Data
            const channelData: IChannel = convertChatToChannelData(user.id, targetChannel);
            userData.channels.push(channelData.id); // Add Channel Id to UserData

            // Update User Data and Insert New Channel Data
            await databaseManager.unsertUserData(userData);
            await databaseManager.unsertChannelData(user.id, channelData);

            // Send Registered Message to Admin
            await messageTemplate.sendChannelRegisteredMessage(userData, channelData, targetChannel.invite_link);
            
            // Invite Link
            await messageTemplate.sendChannelInviteLink(user.id, targetChannel, channelData);
        }
    }catch(e){
        console.log('ERROR:', e);
    }
}

export async function removeChannel(targetChatId: number)
{
    // Check Database has Channel Data
    const channelData = await databaseManager.getChannelData(targetChatId);
    if(channelData === undefined) { return; }

    // Get Admin Data
    const userData = await databaseManager.getUserDataByChannelID(targetChatId);

    if(userData !== undefined)
    {
        const userId = userData.id;

        // Remove targetChatId from Admin Channels List
        userData.channels = userData.channels.filter(channel => channel !== targetChatId);

        // Send Unregistered Message to Admin
        await messageTemplate.sendChannelUnregisteredMessage(userData, channelData);

        if(userData.subscribedChannels.length > 0 || userData.channels.length > 0){
            // Update Admin Data in DB and Remove Channel Data from Database
            await databaseManager.unsertUserData(userData);

        }else {
            await databaseManager.removeUserData(userData.id);
        }

        await databaseManager.removeChannelData(targetChatId);

        return userId;
    }

    return -1;
}

export async function updateChannel(channelData:IChannel): Promise<Boolean> {
   return await databaseManager.unsertChannelData(channelData.ownerId, channelData);
}

export function convertChatToChannelData(ownerId: number, targetChat: Chat.ChannelChat | Chat.GroupChat | Chat.SupergroupChat) : IChannel
{
    const channelInviteLink = getWebAppLink(targetChat.id);

    return {
        id: targetChat.id,
        ownerId: ownerId,
        title: targetChat.title,
        type: targetChat.type,
        inviteLink: channelInviteLink,
        subscribers: [],
        subscriptionPlans: createDefaultSubscriptionPlans(),
    };
}

export async function removeSubscriberId(channelId: number, removeMemberId: number) {
    const channelData = await databaseManager.getChannelData(channelId);

    if(channelData){
        channelData.subscribers = channelData.subscribers.filter(x => x !== removeMemberId);
        await updateChannel(channelData);
    }

    return channelData;
}

function createDefaultSubscriptionPlans(): SubscriptionPlan[] {
    const subPlans: SubscriptionPlan[] = [];

    const basicPlan: SubscriptionPlan = {
        id: '0',
        name: 'Basic Plan',
        duration: '7', // Days
        price: '0.5', // TON
        description: 'Hi! Join us with this Basic Plan and enjoy 7 days of access. We’re excited to have you with us!',
    };

    const standardPlan: SubscriptionPlan = {
        id: '1',
        name: 'Standard Plan',
        duration: '30', // Days
        price: '0.85', // TON
        description: 'Unlock more with the Standard Plan! Enjoy 30 days of premium access and exclusive content.',
    };

    const premiumPlan: SubscriptionPlan = {
        id: '2',
        name: 'Premium Plan',
        duration: '90', // Days
        price: '2', // TON
        description: 'Go all-in with the Premium Plan! Get 90 days of full access and the best features we offer.',
    };

    subPlans.push(basicPlan, standardPlan, premiumPlan);

    return subPlans;
}