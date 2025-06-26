import { User } from "telegraf/types";
import * as databaseManager from '../db/databasemanager';
import { IData } from "./types";

export async function getOrCreateUserData(user: User) : Promise<IData | undefined> {
    let userData = await getUserDataFromDB(user.id);

    if(userData === undefined) {
        userData = await createNewUserInDB(user);
    }

    return userData;
}

export async function createNewUserInDB(owner: User) 
{
    const userData: IData = createNewUserData(owner);

    const isUserDataAddedSuccessfull = await databaseManager.unsertUserData(userData);

    if(isUserDataAddedSuccessfull){ return userData; }
    else { return undefined; }
}

export async function getUserDataFromDB(id: number): Promise<IData | undefined> {
    return await databaseManager.getUserData(id);
}

export function createNewUserData(user: User) : IData {
    return {
        id: user.id,
        username: getUserNameOf(user),
        totalChannelSubscribers: 0,
        channels: [],
        subscribedChannels: [],
        transactions: []
    };
}

export async function updateUserDataInDB(userData: IData) : Promise<Boolean> {

    return databaseManager.unsertUserData(userData);
}

export async function deleteUserData(userId:number) {
    return databaseManager.removeUserData(userId);
}

export async function removeSubscribedChannelId(userId: number, removeChannelId: number) {
    const userData = await getUserDataFromDB(userId);

    if(userData){
        userData.subscribedChannels = userData.subscribedChannels.filter(x => x !== removeChannelId);

        console.log('Remove Channel ID from UserData: ', userData);
        if(userData.subscribedChannels.length > 0 || userData.channels.length > 0){
            await updateUserDataInDB(userData);
        }else{
            // delete user data
            console.log("Delete User Data from DB:", userData);

            await deleteUserData(userId);
        }
    }
}

function getUserNameOf(user: User) : string
{
    return user.username ? user.username : user.first_name;
}