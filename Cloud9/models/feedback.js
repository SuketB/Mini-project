// dependencies
const mongoose = require('mongoose');



// Create Model
const Schema = mongoose.Schema;

const Feedback = new Schema(
  {
    

 

    feedback: String,

    user: {
      type: mongoose.Types.ObjectId,
      ref: 'userData'
    },
  },
  { timestamps: true }
)


// Export Model

module.exports = mongoose.model('Feedback',Feedback);
