import { Request, Response, Router } from "express";
import { IChannel, IData, IMember } from ".././bot/types";
import { Readable } from "stream";
import * as cipher from '.././cipherology/cipher';
import * as userManager from ".././bot/BotUserManager";
import * as channelManager from ".././bot/BotChannelManager";
import * as subscribersManager from '.././bot/BotSubscribersManager'
import * as telegram from ".././bot/Bot";
import * as expireManager from "../bot/ExpiredMemberManager";
import * as databaseManager from '../db/databasemanager';
import * as payloadManager  from '../crypto/payloadManager';
import { TransactionPayloadData } from "../crypto/payloadTypes";
import '../utils/timeExtension';
import { getChannelInviteLink, getRegisteredChannel } from "../bot/services/ChannelService";

const router = Router();

router.get("/", (req: Request, res: Response) => {
    res.json('Server is running very Well.').status(200);
});

/// GET ----------------------------------------------------------------------------
// All data Request from Database
router.get("/api/allData", async (req: Request, res: Response) => {   

  const allData = await databaseManager.getAllData();
  
  res.json(JSON.parse(allData)).status(200);
});

// User Request
router.get('/api/user/:id', async (req: Request, res: Response) => {

  try {
    if(req.params.id) {
      const userID: number = Number.parseInt(req.params.id);

      console.log("Get User:", userID);

      const userData: IData | undefined = await userManager.getUserDataFromDB(userID);
      
      if(userData !== undefined){
        res.status(200).json(userData);

        return;
      }
      res.status(200).json({ data: 'user_not_found' });
    }
  }catch(e){
     res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Channel Request
router.get('/api/channel/:id', async (req: Request, res: Response) => {

  try {
      if(req.params.id){
          const channelId: number = Number.parseInt(req.params.id);

          console.log("Get Channel:", channelId);

          const channelData: IChannel | undefined = await databaseManager.getChannelData(channelId);
          
          if(channelData !== undefined){
            res.status(200).json(channelData);

            return;
          }

          res.status(400).json({ error: "Channel data is missing." });
      }
  } catch(e) {
    res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Channel Member Request
router.get('/api/channel/:channelId/member/:memberId', async (req: Request, res: Response) => {

  try {
    const { channelId, memberId } = req.params;

    if(channelId && memberId){
        const channelIdAsNum: number = Number.parseInt(channelId);
        const memberIdAsNum: number = Number.parseInt(memberId);

        console.log("Get Member:", memberIdAsNum);

        const member = await subscribersManager.getMemberOfChannel(channelIdAsNum, memberIdAsNum);

        if(member){
          res.status(200).json(member);

          return;
        }

        res.status(400).json({ error: "Member data is missing." });

        return;
    }

    res.status(400).json({ error: "Channel data is missing." });

  } catch (e) {
    res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Channel All Members Request
router.get('/api/channel/:channelId/allmembers', async (req: Request, res: Response) => {

    try {
      const { channelId } = req.params;

      if(channelId)
      {
          const channelIdAsNum: number = Number.parseInt(channelId);

          console.log("Get All Members DATA:", channelIdAsNum);

          const members = await subscribersManager.getAllMembersOfChannel(channelIdAsNum);

          if(members !== undefined){
            res.status(200).json(members);

            return;
          }

          res.status(400).json({ error: "Members data is missing." });

          return;
      }

      res.status(400).json({ error: "Channel data is missing." });
  }
  catch(e) {
    res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Channel Data Request
router.get('/api/inviteLink/:link/member/:memberid', async (req: Request, res: Response) => {
  try {

    const { link, memberid } = req.params;

    if (link) {
      const linkHash: string = link;

      const channelId: number = channelManager.getChannelIdFromHash(linkHash);

      // Get 
      const channelPhotoEndPoint = cipher.compressData(channelId);
      const channelData = await databaseManager.getChannelData(channelId);
      const tgChannel = await getRegisteredChannel(channelData.ownerId, channelId);
      

      if(channelData === undefined) { res.status(400).json({ error: 'channel_is_missing' }); return; }
      const subscribersCount = channelData.subscribers.length;

      const member = await subscribersManager.getMemberOfChannel(channelId, Number.parseInt(memberid));

      if (tgChannel) {
        const channelResponse = {
          title: tgChannel.title,
          photoEndpoint: tgChannel.photo ? `/channelPhoto/${channelPhotoEndPoint}` : null, // Provide a safe endpoint
          description: tgChannel.description,
          subscribers: subscribersCount,
          plans: channelData.subscriptionPlans,
          subscribedMember: member,
          isOwner: channelData.ownerId.toString() === memberid
        };

        const compressedData = cipher.compressData(channelResponse);

        res.status(200).json(compressedData);
        return;
      }

      res.status(400).json({ error: "Channel data is missing." });
    }
  } catch (e) {
    res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Channel Photo Request
router.get('/api/channelPhoto/:channelId', async (req: Request, res: Response) => {
  try {
    const decompressedId = cipher.decompressData(req.params.channelId);

    const channelId: number = Number.parseInt(decompressedId);
    const channelData = await databaseManager.getChannelData(channelId);
    const tgChannel = await getRegisteredChannel(channelData.ownerId, channelId);

    if (tgChannel.photo) {
      const photoUrl = await telegram.bot.telegram.getFileLink(tgChannel.photo.big_file_id);
      const photoResponse = await fetch(photoUrl);

      if (!photoResponse.ok) {
        res.status(photoResponse.status).send('Error fetching photo');
        return;
      }

      // Convert the response.body to a Node.js-readable stream
      const reader = photoResponse.body.getReader();

      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });

      // Set the content type header and pipe the stream
      res.setHeader('Content-Type', photoResponse.headers.get('Content-Type') || 'image/jpeg');
      stream.pipe(res);
    } else {
      res.status(404).send('No photo available for this channel');
    }
  } catch (e) {
    res.status(500).json({ error: "Server Error.", reason: e });
  }
});

// Transaction Payload Request
router.get('/api/transaction/:userid/username/:name/link/:linkHash/selectedplan/:planid', async (req: Request, res: Response) => {
  try {

    const { userid, name, linkHash, planid } = req.params;

    const unixtime = Date.now(); // Current timestamp (seconds)

    const data: TransactionPayloadData = {
      owner: userid,
      username: name,
      channel: linkHash,
      plan: planid,
      time: unixtime,
    };

    const payload = payloadManager.createPayload<TransactionPayloadData>(data);

    const payloadData = { payload: payload };
    const compressedData = cipher.compressData(payloadData);
    
    res.status(200).json(compressedData);
  } catch (e) {
    console.error('Error generating payload:', e);
    res.status(500).json({ error: 'Server Error.', reason: e.message });
  }
});

///--------------------------------------------------------------------------------
// ################################################################################
/// POST ##########################################################################
// ################################################################################

// Verify Transaction Request
router.post("/api/verify", async (req: Request, res: Response) => {
  try {
    // BOC Data after Transaction Success on TON
    const { data } = req.body;

    if (!data) {
       res.status(400).json({ error: "BOC data is required." });
    }

    const decompressedData = payloadManager.decodePayload<TransactionPayloadData>(data);
    
    if(decompressedData){
      // Get Channel Data
      const channelId: number = channelManager.getChannelIdFromHash(decompressedData.channel);
      const channelData = await databaseManager.getChannelData(channelId);

      // Get Selected Subscription Plan Data
      const choosedPlan = channelData.subscriptionPlans.find(x => x.id === decompressedData.plan);
      const days = Number.parseInt(choosedPlan.duration);

      // Calculate Expiration Date and Generate Link for New Subscriber
      const startDate = new Date(decompressedData.time);
      // const planExpireDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000));
                                                            //      day  hour  min  millisec
      const planExpiredTime = startDate.getRoundedNextTime(60 * 1000);

      const joinLink = await getChannelInviteLink(channelId);

      // New Subscriber
      const newSub: IMember = {
        id: decompressedData.owner,
        username: decompressedData.username,
        subscribedChannelId: channelId,
        subscriptionPlanId: decompressedData.plan,
        role: 'subscriber',
        startdate: startDate.getTime().toString(),
        enddate: (planExpiredTime * 1000).toString(),
        joinLink: joinLink
      };

      const isNewSubAdded = await subscribersManager.addNewSubscriber(channelData, newSub);

      await expireManager.addNewMemberToExpire(planExpiredTime, newSub);

      console.log('expiredTime:', planExpiredTime);

      const verificationResponse = { isVerified: true, isSubscriptionDataCreated: isNewSubAdded, oneTimeLink: joinLink };
      
      const compressedData = cipher.compressData(verificationResponse);

      res.status(200).json(compressedData);
    }else{
      res.status(400).json(undefined);
    }

  } catch (error) {
    console.error("Error decoding BOC:", error);
    res.status(500).json({ error: "Failed to decode BOC.", details: error.message });
  }
});

// Update Channel Data Request
router.post('/api/channel/:channelId', async (req: Request, res: Response) => {

    const { channelId } = req.params;
    const channelData = req.body;

    // Validate inputs
    if (!channelId) {
        res.status(400).json({ error: "Channel ID is required." });

        return;
    }

    if (!channelData || Object.keys(channelData).length === 0) {
        res.status(400).json({ error: "Channel data is missing." });

        return;
    }

    try {
      const updatedResponse = await channelManager.updateChannel(channelData);

      // Respond with success
      res.status(200).json({ message: updatedResponse });
    } catch (error) {
      res.status(500).json({ error: "Failed to save channel data.", reason: error });
    }
});

///--------------------------------------------------------------------------------

export default router;