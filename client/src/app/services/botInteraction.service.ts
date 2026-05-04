import { Injectable } from '@angular/core';
import { BotServices } from './botServices';

export interface BotChatCallbacks {
    sendBotMessage: (convId: string, botParticipant: any, message: string, typingId?: string) => void;
    showBotTyping: (convId: string, botParticipant: any) => string;
    removeBotTyping: (convId: string, typingId: string) => void;
}

@Injectable({
    providedIn: 'root'
})
export class BotInteractionService {
    public state: 'IDLE' | 'WAITING_NAME' | 'WAITING_USERNAME' = 'IDLE';
    private tempBotData = { full_name: '', bot_name: '' };
    private callbacks!: BotChatCallbacks;
    
    private currentConvId: string = '';
    private currentBotParticipant: any = null;

    constructor(private botServices: BotServices) {}

    public registerCallbacks(callbacks: BotChatCallbacks) {
        this.callbacks = callbacks;
    }

    public resetState() {
        this.state = 'IDLE';
        this.tempBotData = { full_name: '', bot_name: '' };
    }

    public handleCommand(command: string, convId: string, botParticipant: any) {
        this.currentConvId = convId;
        this.currentBotParticipant = botParticipant;
        
        if (command.startsWith('/newbot')) {
            this.state = 'WAITING_NAME';
            this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant, "Alright, a new bot. How are we going to call it? Please choose a name for your bot.");
        }
        if (command.startsWith('/mybots')) {
            this.executeGetBots();
        }
    }

    private executeGetBots() {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);
        
        this.botServices.getBotList().subscribe({
            next: (res: any) => {
                this.callbacks.removeBotTyping(convId, typingId);
                const bots = res.metadata;
                
                if (!bots || bots.length === 0) {
                    this.callbacks.sendBotMessage(convId, botPart, "You haven't created any bots yet. Use /newbot to create one.");
                    return;
                }

                let msg = "Here is the list of your bots:\n\n";
                bots.forEach((bot: any, index: number) => {
                    msg += `${index + 1}. ${bot.full_name} (${bot.bot_name})\n`;
                    msg += `Token: \`${bot.token_hash}\`\n`;
                    msg += `Webhook: ${bot.webhook_url || 'Not set'}\n`;
                    msg += `Status: ${bot.status}\n\n`;
                });
                
                this.callbacks.sendBotMessage(convId, botPart, msg.trim());
            },
            error: (err) => {
                this.callbacks.removeBotTyping(convId, typingId);
                this.callbacks.sendBotMessage(convId, botPart, "Sorry, I couldn't fetch your bots at this time. Please try again later.");
            }
        });
    }

    public handleInteraction(input: string, convId: string, botParticipant: any) {
        this.currentConvId = convId;
        this.currentBotParticipant = botParticipant;
        
        if (input.toLowerCase() === '/cancel') {
            this.resetState();
            this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant, 'Bot creation cancelled.');
            return;
        }

        if (this.state === 'WAITING_NAME') {
            this.tempBotData.full_name = input;
            this.state = 'WAITING_USERNAME';
            this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant, `Good. Now let's choose a username for your bot. It must end in "bot". Like this, for example: TetrisBot or tetris_bot.`);
        } else if (this.state === 'WAITING_USERNAME') {
            const botName = input.trim();
            if (!botName.toLowerCase().endsWith('bot')) {
                this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant, `Sorry, the username must end in "bot". Please try again (e.g., TetrisBot or tetris_bot):`);
                return;
            }

            this.tempBotData.bot_name = botName;
            this.state = 'IDLE';
            
            this.executeCreateBot(this.tempBotData.full_name, this.tempBotData.bot_name);
        }
    }

    private executeCreateBot(full_name: string, bot_name: string) {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);
        const formattedBotName = bot_name.startsWith('@') ? bot_name : '@' + bot_name;
        
        this.botServices.createBot(full_name, formattedBotName).subscribe({
            next: (res: any) => {
                this.callbacks.sendBotMessage(convId, botPart, `Done! Congratulations on your new bot. You will find it at ${formattedBotName}. You can now start using it in your conversations!`, typingId);
            },
            error: (err) => {
                const errorMessage = err.error?.message || 'something went wrong';
                this.callbacks.sendBotMessage(convId, botPart, `I am sorry, but ${errorMessage}. Please try another username (must end in "bot"):`, typingId);
                this.state = 'WAITING_USERNAME';
            }
        });
    }
}
