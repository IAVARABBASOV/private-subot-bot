import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { DataMap, HashData } from '../bot/types';

let db: admin.firestore.Firestore;
let userCollection: admin.firestore.CollectionReference;
let channelCollection: admin.firestore.CollectionReference;
let expiredMembersCollection: admin.firestore.CollectionReference;

export async function init() {
  // create an Astra DB client
  const serviceAccount = JSON.parse(
    (await readFile(new URL('./secret/tg-chan-ownership-firebase-adminsdk-fbsvc-3af0b0faf6.json', import.meta.url))).toString()
  );


  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  admin.app().auth();

  db = admin.firestore();

  userCollection = db.collection('users');
  channelCollection = db.collection('channels');
  expiredMembersCollection = db.collection('expiredMembers');

  console.log("**********************************************************");  
  console.log("DB Connection Success ✅", db.databaseId);
  console.log("**********************************************************");  
}

//----------------------------------------------------------------------------------------------
// #################### SET METHODS ##########################################################
//----------------------------------------------------------------------------------------------

// User Data Insert
export async function insertUserData(_id, _hash) {

  try
  { 
      const result = await userCollection.doc(String(_id)).set({
          hash: _hash
      });
      
      console.log(`User data inserted for ID: ${_id}`);

      return result;
  }
  catch(e)
  {
      return undefined;
  }
}

// Channel Data Insert
export async function insertChannelData(_userId, _channelId, _hash) {

  try
  { 
      const result = await channelCollection.doc(String(_channelId)).set({
          ownerId: _userId,
          hash: _hash
      });

      console.log(`Channel data inserted for ID: ${_channelId}`);

      return result;
  }
  catch(e)
  {
      return undefined;
  }
}

// Member Data Insert
export async function insertChannelMemberData(_channelId, _memberId, _hash) {
  try
  { 
      const result = await channelCollection.doc(String(_channelId)).collection('members').doc(String(_memberId)).set({
          hash: _hash
      });

      console.log(`Member data inserted for Channel ID: ${_channelId}, Member ID: ${_memberId}`);

      return result;
  }
  catch(e)
  {
      return undefined;
  }
}

// Expire Data Insert
export async function insertExpireData(_time, _memberId, _channelId) {
  try
  { 
      const result = await expiredMembersCollection.doc(String(_time)).collection('expiredMembers').doc(String(_memberId)).set({
          channelId: _channelId
      });

      console.log(`Expired member data inserted for Member ID: ${_memberId}, Channel ID: ${_channelId}, Time: ${_time}`);

      return result;
  }
  catch(e)
  {
      return undefined;
  }
}
//----------------------------------------------------------------------------------------------
// #################### GET METHODS ##########################################################
//----------------------------------------------------------------------------------------------

export async function getAllData() : Promise<DataMap[] | undefined>
{
  try {
      const result = await userCollection.get();
    
      const allData = result.empty
        ? []
        : result.docs.map(doc => ({
            hash: doc.data().hash,
          }));

      console.log(`Retrieved ${allData.length} user records.`);

      return allData;
  }
  catch (e) {
      return undefined;
  }
}

export async function getUserDataByID(_id): Promise<HashData | undefined> {
  try {
      const doc = await userCollection.doc(String(_id)).get();
      if (doc.exists) {
          console.log(`User data retrieved for ID: ${_id}`);
          // Assuming the hash is stored in the 'hash' field
          return { hash: doc.data()?.hash };
      } else {
          console.log(`No user found with ID: ${_id}`);
          return undefined;
      }
  } catch (error) {
      console.error("Error getting user data:", error);
      return undefined;
  }
}

// Get User Data via Channel id
export async function getUserDataByChannelID(_id) 
{
  try {

    // Fetch the channel document
    const channelDoc = await channelCollection.doc(String(_id)).get();
    if (!channelDoc.exists) {
      console.log(`No channel found with ID: ${_id}`);
      return undefined;
    }

    const channelOwnerId = channelDoc.data().ownerId;

    return await getUserDataByID(channelOwnerId);

  } 
  catch (error) {
    return undefined;
  }
}

// Get Channel Data
export async function getChannelData(_channelId) {
  try {

    const doc = await channelCollection.doc(String(_channelId)).get();

    if (doc.exists) {
      const channelData = doc.data().hash;

      console.log(`Channel data retrieved for ID: ${_channelId} ##### `, channelData);
      return channelData;
    } else {
      console.log(`No channel found with ID: ${_channelId}`);
      return undefined;
    }
  } 
  catch (error) {
    return undefined;
  }
}

// Get Member Data
export async function getChannelMemberData(_channelId, _memberId) {
  try {

    const channelDoc = await channelCollection.doc(String(_channelId)).get();
    if (!channelDoc.exists) {
      console.log(`No channel found with ID: ${_channelId}`);
      return undefined;
    }

    const membersCollection = channelDoc.ref.collection('members');
    const memberDoc = await membersCollection.doc(String(_memberId)).get();

    if (memberDoc.exists) {
      const channelMemberData = memberDoc.data().hash;

      console.log(`Channel member data retrieved for Channel ID: ${_channelId}, MemberID: ${_memberId} ##### `, channelMemberData);

      return channelMemberData;
    } else {
      console.log(`No member found with ID: ${_memberId} in Channel: ${_channelId}`);
      return undefined;
    }
  } 
  catch (error) {
    return undefined;
  }
}

// Get All Members Data
export async function getChannelAllMembersData(_channelId): Promise<DataMap[]> {
  try {

    const channelDoc = await channelCollection.doc(String(_channelId)).get();
    if (!channelDoc.exists) {
      console.log(`No channel found with ID: ${_channelId}`);
      return undefined;
    }

    const membersCollection = channelDoc.ref.collection('members');
    const membersSnapshot = await membersCollection.get();

    if (membersSnapshot.empty) {
      console.log(`No members found in Channel: ${_channelId}`);
      return [];
    }

    const membersData = membersSnapshot.docs.map(doc => ({ id: { hash: doc.data().hash } }));

    console.log(`Retrieved ${membersData.length} members from Channel: ${_channelId}`);
    return membersData;
  } 
  catch (error) {
    return undefined;
  }
}

// Get All Expired Data
export async function getExpiredMembersData(_time) {
  try {

    const expiredMembersDoc = await expiredMembersCollection.doc(String(_time)).get();
    if (!expiredMembersDoc.exists) {
      console.log(`No expired members found for Time: ${_time}`);
      return [];
    }

    const expiredMembersColl = expiredMembersDoc.ref.collection('expiredMembers');
    const expiredMembersSnapshot = await expiredMembersColl.get();

    if (expiredMembersSnapshot.empty) {
      console.log(`No expired members found for Time: ${_time}`);
      return [];
    }

    const expiredMembersData = expiredMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return expiredMembersData;
  } 
  catch (error) {
    return undefined;
  }
}

// Get All Expired Data
export async function getExpiredsData() {
  try {
    const expiredMembersSnapshot = await expiredMembersCollection.get();
    if (expiredMembersSnapshot.empty) {
      console.log(`No expired members found`);
      return [];
    }

    const expiredMembersData = expiredMembersSnapshot.docs.map(doc => doc.data().hash);
    console.log(`Retrieved ${expiredMembersData.length} expired members.`);
    return expiredMembersData;
  } catch (error) {
    console.error("Error getting expired members data:", error);
    return undefined;
  }
}

//----------------------------------------------------------------------------------------------
// #################### REMOVE METHODS #########################################################
//----------------------------------------------------------------------------------------------

export async function removeUserData(_id) {
  try {
    await userCollection.doc(String(_id)).delete();
    console.log(`User data removed for ID: ${_id}`);

    return true;
  } catch (error) {
    console.error(`Error removing user data for ID: ${_id}`, error);
    return false;
  }
}

// Remove Channel Data
export async function removeChannelData(_id) {

  try
  {
      await channelCollection.doc(String(_id)).delete();
      console.log(`Channel data removed for ID: ${_id}`);

      return true;
  }
  catch(e)
  {
      return false;
  }
}

// Remove Member Data
export async function removeMemberData(_channelId, _memberId) {

  try
  {
      const channelDoc = await channelCollection.doc(String(_channelId)).get();
      if (!channelDoc.exists) {
        console.log(`No channel found with ID: ${_channelId}`);
        return false;
      }
      const membersCollection = channelDoc.ref.collection('members');
      await membersCollection.doc(String(_memberId)).delete();  
      
      console.log(`Member data removed for Channel ID: ${_channelId}, Member ID: ${_memberId}`);

      return true;
  }
  catch(e)
  {
      return false;
  }
}

// Remove Expired Data
export async function removeExpiredData(_time) {

  try
  {
      const expiredMembersDoc = await expiredMembersCollection.doc(String(_time)).get();
      if (!expiredMembersDoc.exists) {
        console.log(`No expired members found for Time: ${_time}`);
        return false;
      }
      await expiredMembersCollection.doc(String(_time)).delete();

      console.log(`Expired Time data removed: ${_time}`);

      return true;
  }
  catch(e)
  {
      return false;
  }
}

// Remove All Database
export async function removeAll() 
{
    try {
        const userDocs = await userCollection.get();
        const channelDocs = await channelCollection.get();
        const expiredDocs = await expiredMembersCollection.get();
        await Promise.all([
            ...userDocs.docs.map(doc => doc.ref.delete()),
            ...channelDocs.docs.map(doc => doc.ref.delete()),
            ...expiredDocs.docs.map(doc => doc.ref.delete())
        ]);

        console.log("All data removed from the database.");

        return true;
    }
    catch(e)
    {
        return false;
    }
}

export default db;