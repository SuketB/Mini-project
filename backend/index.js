const express = require('express')
const connectToDatabase = require('./db');
const app = express()
const port = 4000

connectToDatabase();
app.use(express.json());


app.use('/u/auth',require('./Router/Auth'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})