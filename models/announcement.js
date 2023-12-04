const mongoose = require("mongoose");
const Schema = mongoose.Schema;



const AnnouncementSchema = new Schema({
    text: String,
    title: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    postedAt: {
        date: String,
        time: String
    },
    isArchived: Boolean
})


module.exports = mongoose.model('Announcement', AnnouncementSchema)