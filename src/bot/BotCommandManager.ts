import { BotCommand } from "telegraf/types";
import { bot } from "./Bot";

export async function setMyCommands(chatId: number, commandsData: BotCommand[]) {
        const commands: BotCommand[] = [];
    
        commandsData.forEach(c =>{
            commands.push({
                command: c.command,
                description: c.description
            })
        });
    
    return await bot.telegram.setMyCommands(commands,{ scope:{ type: 'chat', chat_id: chatId } });
}

export async function removeMyCommand(chatId: number, command: string) {
   let myCommands = await bot.telegram.getMyCommands({scope: {chat_id: chatId, type: 'chat'}});

   myCommands = myCommands.filter(x => x.command !== command);

   return await setMyCommands(chatId, myCommands);
}

export async function removeMyCommands(chatId: number, commands: string[]) {
    let myCommands = await bot.telegram.getMyCommands({scope: {chat_id: chatId, type: 'chat'}});
 
    commands.forEach(command =>{
        myCommands = myCommands.filter(x => x.command !== command);
    });
 
    return await setMyCommands(chatId, myCommands);
 }

export async function addMyCommand(chatId: number, command: BotCommand) {
    let myCommands = await bot.telegram.getMyCommands({scope: {chat_id: chatId, type: 'chat'}});

    myCommands.push(command);
 
    return await setMyCommands(chatId, myCommands);
}

export async function addMyCommands(chatId: number, commands: BotCommand[]) {
    let myCommands = await bot.telegram.getMyCommands({scope: {chat_id: chatId, type: 'chat'}});

    commands.forEach(command =>{
        myCommands.push(command);
    });
 
    return await setMyCommands(chatId, myCommands);
}

export async function resetMyCommands(chatId: number) {
    await bot.telegram.deleteMyCommands({scope: {chat_id: chatId, type: 'chat'}});

    const defualtCommandsData: BotCommand[] = [];
    defualtCommandsData.push({
        command: 'start',
        description: 'Start the Bot'
    });

    defualtCommandsData.push({
        command: 'subscribe',
        description: 'Subscribe to Channel or Group'
    });

    defualtCommandsData.push({
        command: 'register',
        description: 'Register Your Channel or Group in Bot'
    });

    return await setMyCommands(chatId, defualtCommandsData);
}

export function getNumberFromCommand(command: string): number {
    const match = command.match(/\d+/); // Look for one or more digits
    return match ? parseInt(match[0], 10) : 0; // Return the number or null if no number is found
}