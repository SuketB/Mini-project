// dependencies
const mongoose = require('mongoose')

// Create Model
const Schema = mongoose.Schema

const ActiveSession = new Schema({
  start_time: {
    type: String,
    required: true
  },
  start_date: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'userData',
    required: true
  }
})
// Export Model

module.exports = mongoose.model('ActiveSession', ActiveSession, 'ActiveSession')
