import { IMember } from './types';
import * as databaseManager from '../db/databasemanager';
import * as subscriberManager from './BotSubscribersManager';

export async function addNewMemberToExpire(time: number, member: IMember){
    // Add Member for remove
    await databaseManager.unsertExpiredMember(time, member);

    const allExpired = await databaseManager.getAllExpiredMembersData(time);

    console.log("allExpired:", allExpired);
}

export async function kickExpiredMembers(time: number){

    try {

        // Get All members by expire time
        const expiredMembers = await databaseManager.getAllExpiredMembersData(time);

        if(expiredMembers !== undefined){

            let expiredTimes: number[] = [];

            const promises = expiredMembers.map(async (x) =>{

                // Convert Channel and Member id to number
                const channelId = Number.parseInt(x.channelId);
                const memberId = Number.parseInt(x.memberId);

                await subscriberManager.removeSubscriber(channelId, memberId);

                const isTimeAdded = expiredTimes.includes(x.time);
                if(!isTimeAdded) {
                    expiredTimes.push(x.time);
                }
            });

            await Promise.all(promises);

            if(expiredTimes.length > 0){
                await databaseManager.deleteExpiredTimesArray(expiredTimes);
                return true;
            }
            
            return false;
        }else{
            // console.log("Expired Members Not Found: ", time);

            return false;
        }

    }catch(e){
        // console.log('Expired Member REMOVE Not Worked:', e);
        return false;
    }
}