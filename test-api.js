const { Op } = require('sequelize');
const messageReactionModel = require('./server/src/models/messagereactionsModel');
const messagesModel = require('./server/src/models/messagesModel');

async function run() {
  const messages = await messagesModel.findAll({ limit: 5 });
  const ids = messages.map(m => m.id);
  console.log("Message IDs:", ids);
  
  const reactions = await messageReactionModel.findAll({
      where: {
          message_id: {
              [Op.in]: ids
          }
      }
  });
  console.log("Reactions found:", reactions.length);
  process.exit(0);
}
run();
