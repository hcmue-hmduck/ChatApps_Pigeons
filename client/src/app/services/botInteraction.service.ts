import { Injectable } from '@angular/core';
import { BotServices } from './botServices';

export interface BotChatCallbacks {
    sendBotMessage: (convId: string, botParticipant: any, message: string, typingId?: string) => void;
    showBotTyping: (convId: string, botParticipant: any) => string;
    removeBotTyping: (convId: string, typingId: string) => void;
    editLastBotMessage: (newContent: string) => Promise<void>;
    emitBotProfileUpdate: (botUserId: string, updatedFields: { full_name?: string; avatar_url?: string }) => void;
}

@Injectable({
    providedIn: 'root'
})
export class BotInteractionService {
    public state:
        | 'IDLE'
        | 'WAITING_NAME'
        | 'WAITING_USERNAME'
        | 'WAITING_EDIT_NAME'
        | 'WAITING_EDIT_BIO'
        | 'WAITING_EDIT_WEBHOOK'
        = 'IDLE';

    private tempBotData = { full_name: '', bot_name: '' };
    private selectedBotId: string = '';       // bot config PK (bảng bots)
    private selectedBotUserId: string = '';   // user_id của bot cần sửa (KHÔNG phải BotFather)
    private selectedBotName: string = '';

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
        this.selectedBotId = '';
        this.selectedBotUserId = '';
        this.selectedBotName = '';
    }

    // ─── Entry Points ────────────────────────────────────────────────────────

    public handleCommand(command: string, convId: string, botParticipant: any) {
        this.currentConvId = convId;
        this.currentBotParticipant = botParticipant;

        if (command.startsWith('/newbot')) {
            this.state = 'WAITING_NAME';
            this.callbacks.sendBotMessage(convId, botParticipant,
                "Alright, a new bot. How are we going to call it? Please choose a name for your bot.");
        }
        if (command.startsWith('/mybots')) {
            this.executeGetBots();
        }
    }

    public handleInteraction(input: string, convId: string, botParticipant: any) {
        this.currentConvId = convId;
        this.currentBotParticipant = botParticipant;

        if (input.toLowerCase() === '/cancel') {
            this.resetState();
            this.callbacks.sendBotMessage(convId, botParticipant, 'Operation cancelled.');
            return;
        }

        switch (this.state) {
            case 'WAITING_NAME':         return this.onWaitingName(input);
            case 'WAITING_USERNAME':     return this.onWaitingUsername(input);
            case 'WAITING_EDIT_NAME':    return this.onWaitingEditName(input);
            case 'WAITING_EDIT_BIO':     return this.onWaitingEditBio(input);
            case 'WAITING_EDIT_WEBHOOK': return this.onWaitingEditWebhook(input);
        }
    }

    /**
     * TELEGRAM APPROACH: Edit tin nhắn bot tại chỗ thay vì xóa + gửi mới.
     * payload format: "botId:::botName:::botUserId"
     */
    public async handleButtonClick(action: string, payload: string, convId: string, botParticipant: any) {
        this.currentConvId = convId;
        this.currentBotParticipant = botParticipant;

        switch (action) {
            case 'select_bot':
                await this.callbacks.editLastBotMessage(this.buildBotMenu(payload));
                break;

            case 'edit_bot':
                await this.callbacks.editLastBotMessage(this.buildEditMenu(payload));
                break;

            case 'delete_bot': {
                const [botId] = payload.split(':::');
                this.executeDeleteBot(botId);
                break;
            }

            case 'edit_name': {
                const [botId, , botUserId] = payload.split(':::');
                this.state = 'WAITING_EDIT_NAME';
                this.selectedBotId = botId;
                this.selectedBotUserId = botUserId || '';
                await this.callbacks.editLastBotMessage(
                    `<span class="bot-keyboard-header">Please enter the new display name for your bot:</span>`
                );
                break;
            }

            case 'edit_bio': {
                const [botId] = payload.split(':::');
                this.state = 'WAITING_EDIT_BIO';
                this.selectedBotId = botId;
                await this.callbacks.editLastBotMessage(
                    `<span class="bot-keyboard-header">Please enter a new bio for your bot:</span>`
                );
                break;
            }

            case 'edit_webhook': {
                const [botId] = payload.split(':::');
                this.state = 'WAITING_EDIT_WEBHOOK';
                this.selectedBotId = botId;
                await this.callbacks.editLastBotMessage(
                    `<span class="bot-keyboard-header">Please enter the new Webhook URL for your bot:</span>`
                );
                break;
            }

            case 'back_to_bots':
                this.resetState();
                this.executeGetBots(/* editMode = */ true);
                break;
        }
    }

    // ─── Menu Builders ───────────────────────────────────────────────────────

    private buildBotMenu(payload: string): string {
        // payload = "botId:::botName:::botUserId"
        const [botId, botName, botUserId] = payload.split(':::');
        this.selectedBotId = botId;
        this.selectedBotUserId = botUserId || '';
        this.selectedBotName = botName;

        // Truyền đủ 3 phần qua payload để các bước tiếp theo biết botUserId
        const fullPayload = `${botId}:::${botName}:::${botUserId}`;

        let msg = `<span class="bot-keyboard-header">Managing <b>${botName}</b>:</span>`;
        msg += `<div class="bot-inline-keyboard">`;
        msg += `<button class="bot-mention-btn" data-action="edit_bot" data-payload="${fullPayload}">✏️ Edit</button>`;
        msg += `<button class="bot-mention-btn bot-mention-btn--danger" data-action="delete_bot" data-payload="${botId}">🗑️ Delete</button>`;
        msg += `</div>`;
        msg += `<div class="bot-inline-keyboard bot-inline-keyboard--back">`;
        msg += `<button class="bot-mention-btn bot-mention-btn--ghost" data-action="back_to_bots" data-payload="">← Back to list</button>`;
        msg += `</div>`;
        return msg;
    }

    private buildEditMenu(payload: string): string {
        // payload = "botId:::botName:::botUserId"
        const [botId, botName, botUserId] = payload.split(':::');
        this.selectedBotId = botId;
        this.selectedBotUserId = botUserId || '';
        this.selectedBotName = botName;

        // Truyền đủ 3 phần qua payload
        const fieldPayload = `${botId}:::${botName}:::${botUserId}`;

        let msg = `<span class="bot-keyboard-header">What do you want to edit for <b>${botName}</b>?</span>`;
        msg += `<div class="bot-inline-keyboard">`;
        msg += `<button class="bot-mention-btn" data-action="edit_name" data-payload="${fieldPayload}">Display Name</button>`;
        msg += `<button class="bot-mention-btn" data-action="edit_bio" data-payload="${fieldPayload}">Bio</button>`;
        msg += `<button class="bot-mention-btn" data-action="edit_webhook" data-payload="${fieldPayload}">Webhook URL</button>`;
        msg += `</div>`;
        msg += `<div class="bot-inline-keyboard bot-inline-keyboard--back">`;
        msg += `<button class="bot-mention-btn bot-mention-btn--ghost" data-action="back_to_bots" data-payload="">← Back to list</button>`;
        msg += `</div>`;
        return msg;
    }

    // ─── State Handlers ──────────────────────────────────────────────────────

    private onWaitingName(input: string) {
        this.tempBotData.full_name = input;
        this.state = 'WAITING_USERNAME';
        this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant,
            `Good. Now let's choose a username for your bot. It must end in "bot". Like this, for example: TetrisBot or tetris_bot.`);
    }

    private onWaitingUsername(input: string) {
        const botName = input.trim();
        if (!botName.toLowerCase().endsWith('bot')) {
            this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant,
                `Sorry, the username must end in "bot". Please try again (e.g., TetrisBot or tetris_bot):`);
            return;
        }
        this.tempBotData.bot_name = botName;
        this.state = 'IDLE';
        this.executeCreateBot(this.tempBotData.full_name, this.tempBotData.bot_name);
    }

    private onWaitingEditName(input: string) {
        this.state = 'IDLE';
        this.executeUpdateBot(
            this.selectedBotId,
            { full_name: input },
            `✅ Display name updated successfully!`,
            this.selectedBotUserId ? { full_name: input } : undefined
        );
    }

    private onWaitingEditBio(input: string) {
        this.state = 'IDLE';
        this.executeUpdateBot(this.selectedBotId, { bio: input }, `✅ Bio updated successfully!`);
    }

    private onWaitingEditWebhook(input: string) {
        try { new URL(input); } catch {
            this.callbacks.sendBotMessage(this.currentConvId, this.currentBotParticipant,
                `❌ Invalid URL. Please enter a valid Webhook URL (e.g., https://...)`);
            return;
        }
        this.state = 'IDLE';
        this.executeUpdateBot(this.selectedBotId, { webhook_url: input }, `✅ Webhook URL updated successfully!`);
    }

    // ─── API Callers ─────────────────────────────────────────────────────────

    private executeGetBots(editMode = false) {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);

        this.botServices.getBotList().subscribe({
            next: (res: any) => {
                this.callbacks.removeBotTyping(convId, typingId);
                const bots = res.metadata;

                if (!bots || bots.length === 0) {
                    this.callbacks.sendBotMessage(convId, botPart,
                        "You haven't created any bots yet. Use /newbot to create one.");
                    return;
                }

                let msg = `<span class="bot-keyboard-header">Choose a bot to manage:</span>`;
                msg += `<div class="bot-inline-keyboard">`;
                bots.forEach((bot: any) => {
                    // Truyền đủ 3 phần: botId:::botName:::botUserId
                    const payload = `${bot.id}:::${bot.bot_name}:::${bot.bot_user_id}`;
                    msg += `<button class="bot-mention-btn" data-action="select_bot" data-payload="${payload}">${bot.bot_name}</button>`;
                });
                msg += `</div>`;

                if (editMode) {
                    this.callbacks.editLastBotMessage(msg);
                } else {
                    this.callbacks.sendBotMessage(convId, botPart, msg);
                }
            },
            error: () => {
                this.callbacks.removeBotTyping(convId, typingId);
                this.callbacks.sendBotMessage(convId, botPart,
                    "Sorry, I couldn't fetch your bots. Please try again later.");
            }
        });
    }

    private executeCreateBot(full_name: string, bot_name: string) {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);
        const formattedBotName = bot_name.startsWith('@') ? bot_name : '@' + bot_name;

        this.botServices.createBot(full_name, formattedBotName).subscribe({
            next: () => {
                this.callbacks.sendBotMessage(convId, botPart,
                    `Done! Congratulations on your new bot. You will find it at ${formattedBotName}. You can now start using it!`,
                    typingId);
            },
            error: (err) => {
                const msg = err.error?.message || 'something went wrong';
                this.callbacks.sendBotMessage(convId, botPart,
                    `I am sorry, but ${msg}. Please try another username (must end in "bot"):`,
                    typingId);
                this.state = 'WAITING_USERNAME';
            }
        });
    }

    private executeUpdateBot(
        botId: string,
        data: Record<string, any>,
        successMsg: string,
        profileUpdate?: { full_name?: string; avatar_url?: string }
    ) {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);

        this.botServices.updateBot(botId, data).subscribe({
            next: () => {
                // Emit 'updateProfile' với đúng user_id của BOT CẦN SỬA (không phải BotFather)
                if (profileUpdate && this.selectedBotUserId) {
                    this.callbacks.emitBotProfileUpdate(this.selectedBotUserId, profileUpdate);
                }
                this.callbacks.sendBotMessage(convId, botPart, successMsg, typingId);
            },
            error: (err) => {
                const msg = err.error?.message || 'something went wrong';
                this.callbacks.sendBotMessage(convId, botPart,
                    `❌ Failed to update: ${msg}`, typingId);
            }
        });
    }

    private executeDeleteBot(botId: string) {
        const convId = this.currentConvId;
        const botPart = this.currentBotParticipant;
        const typingId = this.callbacks.showBotTyping(convId, botPart);

        this.botServices.deleteBot(botId).subscribe({
            next: () => {
                this.callbacks.sendBotMessage(convId, botPart,
                    `✅ Bot deleted successfully.`, typingId);
            },
            error: (err) => {
                const msg = err.error?.message || 'something went wrong';
                this.callbacks.sendBotMessage(convId, botPart,
                    `❌ Failed to delete: ${msg}`, typingId);
            }
        });
    }
}
