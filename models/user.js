const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    isTutore: Boolean
})

UserSchema.plugin(passportLocalMongoose) //adaugam la schema noastra un field pentru parola, o sa se asigure ca username-urile sunt unice si primim si cateva metode pe care le putem folosi 

module.exports = mongoose.model('User', UserSchema)