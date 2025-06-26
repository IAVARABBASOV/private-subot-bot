import { CallbackQuery, InlineKeyboardButton, ParseMode } from "telegraf/types";
import { bot } from "./Bot";

let confirmationAction;
let cancellationAction;

export async function sendAgreementMessage(chatId: number, msg: string, msgParseMode: ParseMode, confirmAction, cancelAction) {
    
    confirmationAction = confirmAction;
    cancellationAction = cancelAction;

    setupCallbackQuery();
    const keyboardButtons: InlineKeyboardButton[][] = [];
    const buttons: InlineKeyboardButton[] = [];

    buttons.push({
        text: 'Confirm',
        callback_data: 'confirmData'
        
    });

    buttons.push({
        text: 'Cancel',
        callback_data: 'cancelData'
    });

    keyboardButtons.push(buttons);
    await bot.telegram.sendMessage(chatId, msg, { parse_mode: msgParseMode, reply_markup: { inline_keyboard: keyboardButtons } });
}

function setupCallbackQuery(){
    bot.on('callback_query', async (ctx) =>{
        const dataQuery = ctx.update.callback_query as CallbackQuery.DataQuery;
    
        if(dataQuery){
            if(dataQuery.data.includes('confirm')){    
                if(confirmationAction){
                    confirmationAction();
                }
            }
    
            if(dataQuery.data.includes('cancel')){    
                if(cancellationAction){
                    cancellationAction();
                }
            }
        }

        confirmationAction = undefined;
        cancellationAction = undefined;
    
        await ctx.deleteMessage();
    });
}