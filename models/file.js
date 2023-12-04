const mongoose = require("mongoose")
const Schema = mongoose.Schema



const FileSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    data: {
        url: String,
        filename: String
    },
    disc: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    }
})


module.exports = mongoose.model('File', FileSchema)