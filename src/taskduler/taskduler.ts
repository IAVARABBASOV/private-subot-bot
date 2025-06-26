import { schedule } from "node-cron";
import * as telegram from ".././bot/Bot";
import * as expireManager from '../bot/ExpiredMemberManager';

async function taskSchedule(now: Date | 'manual' | 'init'){

    const directTime = Math.floor(Date.now() / 1000);

    const expiredMembersKicked = await expireManager.kickExpiredMembers(directTime);
    
    if(expiredMembersKicked){
        const message = `Expired Members has been kicked from Group: ${directTime}\n${Date.now().toString()}`;

        await telegram.bot.telegram.sendMessage(process.env.OWNER_ID, message);
    }
}

// Every day at 00:00  
// schedule('0 0 * * *', taskSchedule);

// At every minute.  
schedule('* * * * *', taskSchedule);

// At every 10th second.  
// schedule('*/10 * * * * *', taskSchedule);