// dependencies
const mongoose = require('mongoose');

// connect to database
mongoose.connect('mongodb://127.0.0.1:27017/users',{
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// Create Model
const Schema = mongoose.Schema;

const Feedback = new Schema({
  username: {
    type:String,
},
    

    name:String,

   address:String,

   feedback:String,

},
{timestamps:true}

);


// Export Model


module.exports = mongoose.model('Feedback',Feedback);
