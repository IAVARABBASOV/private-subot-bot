import * as databaseManager from '../db/databasemanager';
import { IChannel, IMember } from './types';
import * as userManager from './BotUserManager';
import * as channelManager from './BotChannelManager';
import { User } from 'telegraf/types';
import { trySendSubscriptionEndMessageToUser } from './BotTemplateMessages';
import { removeUserFromChannel as removeUserFromChannelbyBOT } from './services/ChannelService';

export async function addNewSubscriber(channel: IChannel, newMember: IMember) {

    try {
        // Add member Id to Channel subscribers list
        const memberId = Number.parseInt(newMember.id);
        channel.subscribers.push(memberId);

        const newUserData: User = {
            id: memberId,
            first_name: newMember.username,
            is_bot: false
        };

        // Create UserData
        const userData = await userManager.getOrCreateUserData(newUserData);

        if(userData !== undefined){

            // Add Channel id to UserData
            const isChannelExist = userData.subscribedChannels.includes(channel.id);
            if(!isChannelExist) { userData.subscribedChannels.push(channel.id); }

            // Update UserData
            const isUserDataUpdated = await userManager.updateUserDataInDB(userData);

            if(isUserDataUpdated) {
                // Update or Insert Member Data
                const isMemberDataUpdated = await databaseManager.unsertChannelMemberData(channel.id, newMember);

                if(isMemberDataUpdated) {
                    // Update or Insert Channel Data
                    const isChannelDataUpdated = await databaseManager.unsertChannelData(channel.ownerId, channel);     
                    
                    if(isChannelDataUpdated){
                        // New Member Added Successfull!
                        return true;
                    }
                }
            }
        }

        return false;
    } catch(e){
        return false;
    }
}

export async function removeSubscriber(channelId: number, memberId: number) {
    console.log("REMOVE MEMBER from Channel:", channelId, 'Member id:', memberId);

    try{
        // Update Subscribers Array in Channel Data
        const channelData = await channelManager.removeSubscriberId(channelId, memberId);

        // Update Subscribed Channels Array in User Data
        await userManager.removeSubscribedChannelId(memberId, channelId);

        // Remove Member data
        await databaseManager.removeMemberData(channelId, memberId);
        
        // Kick User from Channel/Group
        await removeUserFromChannelbyBOT(channelId, memberId);

        // Send Message to Subscriber via Bot
        await trySendSubscriptionEndMessageToUser(memberId, channelData);

    }catch(e){
        console.log("REMOVE SUBSCRIBER ERROR:", e);
    }
}

export async function updateMemberOfChannel(channelId: number, memberData: IMember) {
    const isMemberDataUpdated = await databaseManager.unsertChannelMemberData(channelId, memberData);

    return isMemberDataUpdated;
}

export async function getAllMembersOfChannel(channelId: number) {
    return await databaseManager.getChannelAllMembersData(channelId);
}

export async function getMemberOfChannel(channelId: number, memberId: number) {
    return await databaseManager.getChannelMemberData(channelId, memberId);
}