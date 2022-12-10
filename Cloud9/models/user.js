// dependencies
const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')
// connect to database
mongoose.connect('mongodb://127.0.0.1:27017/users', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
// Create Model
const Schema = mongoose.Schema


const slotSchema = new Schema({
  username: String,

  date: String,

  slotNumber: Number,

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userData',
  },
})



const User = new Schema({
  username: {
    type: String,

    unique: true,
  },

  email: {
    type: String,
  },

  institute: {
    type: String,
  },

  password: String,

  isAdmin: { type: Boolean, default: false },
})
// Export Model
User.plugin(passportLocalMongoose)

module.exports.userModel = mongoose.model('userData', User, 'userData')
module.exports.slotsModel = mongoose.model('Slots', slotSchema, 'slotData')