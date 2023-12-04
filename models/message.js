const mongoose = require("mongoose")
const Schema = mongoose.Schema



const MessageSchema = new Schema({
    text: String,
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: {
        date: String,
        time: String
    }
})


module.exports = mongoose.model('Message', MessageSchema)