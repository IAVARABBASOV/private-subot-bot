import { DataMap, ExpiredMemberData, HashData, IChannel, IData, IMember } from './../bot/types';
import * as cipher from '../cipherology/cipher';
import dotenv from 'dotenv';
dotenv.config();
import * as db from './firestoreDB';
db.init();

const ciphKey = process.env.CIPHER_ENCRYPT_SECRET_KEY;

//----------------------------- INSERT Method ---------------------------------------------------------------

export async function unsertUserData(userData: IData): Promise<Boolean> {

    log('INSERT USER', userData, '');

    const hashValue = cipher.encryptData(userData, ciphKey);

    const insertedData = await db.insertUserData(userData.id, hashValue);

    return insertedData !== undefined;
}

export async function unsertChannelData(userId: number, channelData: IChannel): Promise<Boolean> {

    log('INSERT CHANNEL', channelData, '');

    const hashValue = cipher.encryptData(channelData, ciphKey);

    const insertedData = await db.insertChannelData(userId, channelData.id, hashValue);

    return insertedData !== undefined;
}

export async function unsertChannelMemberData(channelId: number, memberData: IMember): Promise<Boolean> {

    log('INSERT MEMBER', memberData, '');

    const hashValue = cipher.encryptData(memberData, ciphKey);

    const insertedData = await db.insertChannelMemberData(channelId, memberData.id, hashValue);

    return insertedData !== undefined;
}

export async function unsertExpiredMember(time: number, memberData: IMember) {

    log('INSERT MEMBER to Expire Date', memberData, time);

    const expiredDataInserted = await db.insertExpireData(time, memberData.id, memberData.subscribedChannelId.toString());

    return expiredDataInserted !== undefined;
}

//---------------------------------------------------------------------------------------------
//--------------------------- GET METHOD ------------------------------------------------------

export async function getUserData(id: number) : Promise<IData | undefined> {
    const hashData: HashData = await db.getUserDataByID(id);

    if (hashData !== undefined) {

        const userDecryptedData: IData = cipher.decryptData(hashData.hash, ciphKey);

        log('GET USER DATA', userDecryptedData, '');

        return userDecryptedData;
    }
    else {
        return undefined;
    }
}

export async function getUserDataByChannelID(id: number) : Promise<IData | undefined> {
    const hashData: HashData = await db.getUserDataByChannelID(id);

    if (hashData !== undefined) {

        const userDecryptedData: IData = cipher.decryptData(hashData.hash, ciphKey);

        log('GET User Data by Channel Id', userDecryptedData,`Channel ID: ${id}`);
        return userDecryptedData;
    }
    else {
        return undefined;
    }
}

export async function getChannelData(channelId: number) : Promise<IChannel | undefined> {
    const hash: string | undefined = await db.getChannelData(channelId);

    if (hash !== undefined) {

        const channelDecryptedData: IChannel = cipher.decryptData(hash, ciphKey);

        log('GET CHANNEL DATA', channelDecryptedData, '');
        return channelDecryptedData;
    }
    else {
        return undefined;
    }
}

export async function getChannelMemberData(channelId: number, memberId: number) : Promise<IMember | undefined> {
    const hash: string | undefined = await db.getChannelMemberData(channelId, memberId);

    if (hash !== undefined) {

        const memberDecryptedData: IMember = cipher.decryptData(hash, ciphKey);

        log('GET CHANNEL MEMBER', memberDecryptedData, '');
        return memberDecryptedData;
    }
    else {
        return undefined;
    }
}

export async function getChannelAllMembersData(channelId: number) : Promise<IMember[] | undefined> {
    
    const allMembersData: DataMap[] = await db.getChannelAllMembersData(channelId);

    const allMembersOfChannel: IMember[] = [];

    if(allMembersData) {
        Object.values(allMembersData).forEach((data) => {
            const memberDecryptedData: IMember = cipher.decryptData(data.hash, ciphKey);

            if(memberDecryptedData !== undefined){
                allMembersOfChannel.push(memberDecryptedData);
            }
        });
    }

    if(allMembersOfChannel.length > 0) {

        log('GET All Members Of Channel', allMembersOfChannel, channelId);
        return allMembersOfChannel;
    }

    return undefined;
}

export async function getAllExpiredMembersData(time: number) : Promise<ExpiredMemberData[] | undefined> {
    try{
        const allExpiredsData = await db.getExpiredsData();

        const timeValues = Object.keys(allExpiredsData); 

        const skippedTimes = timeValues.filter( _t => Number.parseInt(_t) <= time);
        
        return await getAllExpiredDataAsync(skippedTimes);

    }catch(e){
        return undefined;
    }
}

async function getAllExpiredDataAsync(foundTimeValues: string[]) {

    const allExpiredMembersData: ExpiredMemberData[] = [];

    const promises = foundTimeValues.map(async (_time) => {
        const t = Number.parseInt(_time);

        const expiredMembers = await getExpiredDataForExactTime(t);

        expiredMembers.map(x => allExpiredMembersData.push(x));
    });

    await Promise.all(promises);

    return allExpiredMembersData;
}

export async function getExpiredDataForExactTime(_time: number) {

    try {
        const allExpiredMembersJson = await db.getExpiredMembersData(_time);

        // Get Members id
        const memberIds = Object.keys(allExpiredMembersJson);

        // Create Expired Member data
        const expireMembers: ExpiredMemberData[] = [];

        memberIds.map(_memberId => {
            // Get Channels data for each member id
            const channels = allExpiredMembersJson[_memberId].channels;

            // Get Channel Ids
            const channelIds = Object.keys(channels);

            channelIds.map(_channelid => {
                const expiredData: ExpiredMemberData = {
                    time: _time,
                    channelId: _channelid,
                    memberId: _memberId
                }

                expireMembers.push(expiredData);
            });
        });

        return expireMembers;
    }
    catch(e){
        return undefined;
    }
}


export async function getAllData(): Promise<string> {

    try {
        const allData:DataMap[] = await db.getAllData();
        const allExpireds = await db.getExpiredsData(); 

        const splittedData = Object.values(allData).map(user => cipher.decryptData(user.hash, ciphKey));

        log('Get ALL Database', splittedData, '');

        // Combine allExpireds and splittedData into a single JSON object
        const combinedData = {
            activeUsers: splittedData,
            expiredUsers: allExpireds
        };
        
        // If you need it as a JSON string
        const jsonCombinedData = JSON.stringify(combinedData, null, 2);
                
        return jsonCombinedData; 
    }catch(e){
        return undefined;
    }
}

//----------------------------------------------------------------------------------------------
//--------------------------- REMOVE METHOD ----------------------------------------------------

export async function removeUserData(id:number): Promise<boolean> {
    log('REMOVE USER:', id, '');

    return await db.removeUserData(id);
}

export async function removeChannelData(id: number): Promise<Boolean> {
    log('REMOVE CHANNEL', id, '');

    return await db.removeChannelData(id);
}

export async function removeMemberData(channelId: number, memberId: number) {
    log('REMOVE MEMBER', channelId, memberId);

    return await db.removeMemberData(channelId, memberId);
}

export async function deleteAllData(): Promise<Boolean> {

    log('Delete ALL DATABASE', '', '');
    
    return await db.removeAll();
}

export async function deleteExpiredTimeData(time: number) {
    return await db.removeExpiredData(time);
}

export async function deleteExpiredTimesArray(times: number[]) {

    try{
        for (let i = 0; i < times.length; i++) {
            const time = times[i];
            await db.removeExpiredData(time);
        }

        return true;
    }catch(e){
        return false;
    } 
}

export async function deleteAllDB() {

    const isAllDataCleared = await deleteAllData();

    const allData2 =  await getAllData();

    log('CLEAR ALL DATA', isAllDataCleared, allData2);
}

//----------------------------------------------------------------------------------------------

function log(methodName, data1, data2){
    console.log(`-------------------------${methodName} START --------------------------------------`);
    console.log(`${methodName} DATA: `, data1, data2);
    console.log(`-------------------------${methodName} END --------------------------------------`);
}