const mongoose = require('mongoose');
const mongoUrl = `mongodb+srv://FCJ1234:kY7DydCrlFfo7OaI@cluster0.zwfl2.mongodb.net/blockchain_testbed?retryWrites=true&w=majority`// ye maindatabase

const connectToDatabase = () =>{
    mongoose.connect(
      'mongodb://localhost:27017/blockchain_testbed',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
      () => {
        console.log('database connected successfully')
      }
    )
}

module.exports = connectToDatabase;