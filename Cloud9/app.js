var express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  methodOverride = require('method-override'),
  Tail = require('tail').Tail,
  fs = require('fs')

const EventEmitter = require('events')
const session = require('express-session') // session middleware
const readLastLines = require('read-last-lines')

const chokidar = require('chokidar')

const passport = require('passport') // authentication
const connectEnsureLogin = require('connect-ensure-login') //authorization

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const User = require('./models/user.js') // User Model
const Feedback = require('./models/feedback.js') //Feedback model

const expressSanitizer = require('express-sanitizer')
const { nextTick } = require('process')
const { MemoryStore } = require('express-session')
const { resolve } = require('path')
const { networkInterfaces } = require('os')
const { error, Console } = require('console')
const { clearCache } = require('ejs')
const ActiveSession = require('./models/ActiveSession.js')
const feedback = require('./models/feedback.js')

let currentUser
let currentUserName
let networkStatus


const emmiter = new EventEmitter()

let loginCache = new Set() //not needed...for multi user
let removedByAdmin = new Set()

var memstore = new MemoryStore()
var Mutex = require('async-mutex').Mutex
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

app.use(expressSanitizer())




app.use(
  session({
    secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
    store: memstore,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
)

app.use(passport.initialize())
app.use(passport.session())

// Passport Local Strategy
passport.use(User.createStrategy())

app.use(function (req, res, next) {
  if (removedByAdmin.has(req.sessionID) === true) {
    copy = req.sessionId
    req.session.destroy(function (err) {
      // cannot access session here
      if (err) {
        next(err)
      }
      removedByAdmin.delete(copy)

      res.render('login', {
        adminlogoutoption: 'show',
        modaloption: 'hide',
        messageoption: 'hidden',
      })
    })
  } else next()
})

// To use with sessions
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const mutex = new Mutex()

app.get('/signup', (req, res) => {
  res.render('signup', { messageoption: 'hidden'})
})

function kick() {
  return new Promise(function (resolve, reject) {
    mutex.acquire().then(function (release) {
      if (!currentUser) {
        release()
        return resolve()
      } else {
        //  removedByAdmin push currentUser.sid

        // removedByAdmin.add(currentUser);

        if (networkStatus === 'ready') {
          currentUser = undefined

          release()

          return resolve()
        } else if (networkStatus === 'createlogs') {
          createNetwork().then(() => {
            var finalString = 'kill'
            try {
              fs.writeFileSync('./../kill.txt', finalString)

              networkStatus = 'removelogs'

              removeNetwork().then(() => {
                currentUser = undefined

                release()
                return resolve()
              })
            } catch (error) {
              release()

              return reject(error)
            }
          })
        } else if (networkStatus === 'running') {
          var finalString = 'kill'
          try {
            fs.writeFileSync('./../kill.txt', finalString)

            networkStatus = 'removelogs'

            removeNetwork().then(() => {
              currentUser = undefined

              release()
              return resolve()
            })
          } catch (error) {
            release()

            return reject(error)
          }
        } else if (networkStatus === 'removelogs') {
          removeNetwork().then(() => {
            currentUser = undefined

            release()
            return resolve()
          })
        }
      }
    })
  })
}

// (req,res,next)=>{

//   if(req.user.isAdmin===true)
//   {
//     next();
//   }
//   else
//   {
//     next(err);
//   }

// }

app.post('/kick', (req, res, next) => {
  if (currentUser) {
    removedByAdmin.add(currentUser)
  }
  kick()
    .then(() => {
      res.redirect('/admin')
    })
    .catch((error) => {
      return next(error)
    })
})

app.get('/login', async (req, res) => {
  console.log(req.sessionID)
  console.log(req)
   
  res.render('login', {
    adminlogoutoption: 'hide',
    modaloption: 'hide',
    messageoption: 'hidden',
  })
})

function valid_cred(req){
  let user_name_str=req.body.username;
  let pwd_str=req.body.password;
  let email_str=req.body.email;
  let int_str=req.body.institute;



  if(pwd_str.length<8 || pwd_str.length>15){
    //password size must be from 8 to 15
    console.log("password 8 to 15!!!");
    
    res.json({ response: 'password 8 to 15!!!' })
    
     return false;
    
  }
  // let is_lower=false;
  // let is_upper=false;
  // let is_int=false;
  // let is_special=false;
  // for(let i=0;i<pwd_str.length;i++){
  //   let cur=pwd_str[i];
  //   if(cur>=97 && cur<=122){
  //     is_lower=true;
  //   }
  //   else if (cur >= 65 && cur <= 90) {
  //     is_upper = true
  //   }
  //   else if (cur >= 48 && cur <= 57) {
  //     is_int = true
  //   }
  //   else{
  //     is_special=true;
  //   }
    
  // }
  // if(!is_special && is_lower && is_int && is_upper){
  //   //correct 
  // }
  // else{
  //   //passwod must conatain intger upper and lower case alphabets
  //   console.log('passwod must conatain intger upper and lower case alphabets');
  //   res.json({response: 'password must conatain intger upper and lower case alphabets'});
  //   return false;
  // }


  return true;
}
app.post('/signup', (req, res) => {
  //console.log(req.body)
  let valid_chek=valid_cred(req);
  
  User.register(
    new User({ username: req.body.username,email :req.body.email,institute: req.body.institute }),
    req.body.password,
    

    (err, user) => {
      if (err) {
        console.dir(err)
        res.json({ knownError: err })
      } else {
        res.json({ message: 'User successfully registered' })
      }
    }
  )
})

function singleUserLogin(req, res, next) {
  mutex.acquire().then(function (release) {
    if (currentUser) {
      req.logout(function (err) {
        if (err) {
          release()
          return next(err)
        }

        release()
        return next('route')
      })
    } else {
      req.release = release
      next()
    }
  })
}

app.post(
  '/login',
  function (req, res, next) {
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err)
      }

      if (!user) {
        return res.render('login', {
          adminlogoutoption: 'hide',
          modaloption: 'hide',
          messageoption: 'visible',
        })
      }

      req.logIn(user, function (err) {
        if (err) {
          return next(err)
        }

        if (user.isAdmin === true) {
          res.redirect('/admin')
        } else {
          return next()
        }
      })
    })(req, res, next)
  },
  // singleUserLogin,
  function (req, res) {
    currentUser = req.sessionID
    currentUserName = req.user.username
    networkStatus = 'ready'
    // req.release()
    // delete req.release
    console.log(req.user)
    

    res.redirect('/')
  }
)

let users = [
  { username: 'suket_1', start_time: '04/11/2022 | 10:30 AM' },
  { username: 'suket_2', start_time: '05/11/2022 | 10:30 AM' },
  { username: 'suket_3', start_time: '06/11/2022 | 10:30 AM' },
  { username: 'suket_4', start_time: '07/11/2022 | 10:30 AM' },
  { username: 'suket_5', start_time: '08/11/2022 | 10:30 AM' },
  { username: 'suket_6', start_time: '09/11/2022 | 10:30 AM' },
  { username: 'suket_7', start_time: '10/11/2022 | 10:30 AM' },
  { username: 'suket_8', start_time: '11/11/2022 | 10:30 AM' },
]

app.post('/login', (req, res) => {
  res.render('login', {
    adminlogoutoption: 'hide',
    modaloption: 'show',
    messageoption: 'hidden',
  })
})

app.get('/admin', async (req, res, next) => {
   const users = await ActiveSession.find({}).populate('user')
  if (req.user.isAdmin === true) {
    res.render('admindashboard', { admin: req.user.username, users })
  } else {
    res.redirect('/login')
  }
})

app.get('/logout', connectEnsureLogin.ensureLoggedIn('/login'), (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }

    kick().then(() => {})

    res.redirect('/login')
  })
})

function referer(req, res, next) {
  if (networkStatus === 'ready') {
    res.redirect('/')
  } else if (networkStatus === 'createlogs') {
    res.redirect('/testbed/createlogs')
  } else if (networkStatus === 'running') {
    res.redirect('/testbed/actions')
  } else if (networkStatus === 'removelogs') {
    res.redirect('/testbed/removelogs')
  }
}

app.get(
  '/',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    if (networkStatus === 'ready') {
      next()
    } else {
      next('route')
    }
  },
  async function (req, res) {
    console.log(req.sessionID)


  
    
    res.render('new')
  }
)

app.get('/', connectEnsureLogin.ensureLoggedIn('/login'), referer)

app.get('/testbed/thankyou', function (req, res) {
  res.render('thankyou')
})

app.get(
  '/testbed/join',
  connectEnsureLogin.ensureLoggedIn('/login'),
  function (req, res) {
    console.log('hello everyone')
    var bootnode = fs.readFileSync('../enode.txt', 'utf8')
    var genesis = fs.readFileSync('../genesis_user.json', 'utf8')
    console.log(bootnode)
    res.render('join', { data: { genesis: genesis, bootnode: bootnode } })
  }
)

function createNetwork() {
  return new Promise((resolve, reject) => {
    console.log('Logs')
    const watcher_endcreatelogs = chokidar.watch('../endcreatelogs.txt')
    console.log('Logs2')
    watcher_endcreatelogs.on('change', (event, path) => {
      console.log(event, path)

      console.log('1')
      console.log('line reaad')
      readLastLines.read('../endcreatelogs.txt', 1).then(function (lines) {
        if (lines === 'end') {
          console.log('2')
          networkStatus = 'running'

          watcher_endcreatelogs.close()

          resolve()
        }
      })
    })
  })
}

app.post('/', connectEnsureLogin.ensureLoggedIn('/login'), async function (req, res) {
  let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();

// current hours
let hours = date_ob.getHours();

// current minutes
let minutes = date_ob.getMinutes();

  const session = new ActiveSession({ 
    start_time: hours + ':' + minutes,
    start_date: year + '-' + month + '-' + date + ' ',
    user: mongoose.Types.ObjectId(req.user._id),
  })

  const resp = await session.save()
  console.log(resp)

  var mode = req.body.mode.toString()
  var flags = req.body.flags.toString()
  var genesis = req.body.genesis.toString()
  var server = req.body.Server.toString()
  var raspberry3 = req.body.Raspberry3.toString()
  var raspberry4 = req.body.Raspberry4.toString()
  var android = req.body.Android.toString()
  var finalString =
    'number of server nodes=' +
    server +
    '\n' +
    'number of raspberry3 nodes=' +
    raspberry3 +
    '\n' +
    'number of raspberry4 nodes=' +
    raspberry4 +
    '\n' +
    'number of android nodes=' +
    android +
    '\n' +
    'mode=' +
    mode +
    '\n' +
    'additional flags=' +
    flags +
    '\n'

  //   genesis validation for errors
  //   geth flags validation for errors.....consensus

  try {
    fs.writeFileSync('./../block14.txt', finalString)

    fs.writeFileSync('../new_genesis.json', genesis)
    console.log('The file was saved!')
    // return res.redirect("./views/new");

    networkStatus = 'createlogs'

    res.redirect('/testbed/createlogs')


    

  } catch (err) {
    next(err)
  }
})

/***************************************page for logs which will subsequently request /events for logs to display************************/
app.get(
  '/testbed/createlogs',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    if (networkStatus === 'createlogs') {
      next()
    } else {
      next('route')
    }
  },
  async function (req, res) {
    const user = await User.findById(req.user._id);


    res.render('logs', { endpoint: '/events', redirect: '/testbed/actions', user})
  }
)

app.get(
  '/testbed/createlogs',
  connectEnsureLogin.ensureLoggedIn('/login'),
  referer
)

/************************************************************************************************************************************************/

/***************************************page for remove network logs which will subsequently request /events2 for logs to display************************/

app.get(
  '/testbed/removelogs',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    if (networkStatus === 'removelogs') {
      next()
    } else {
      next('route')
    }
  },
  function (req, res) {
    res.render('logs', { endpoint: '/events2', redirect: '/testbed/feedback' })
  }
)

app.get(
  '/testbed/removelogs',
  connectEnsureLogin.ensureLoggedIn('/login'),
  referer
)

/************************************************************************************************************************************************/

function eventsHandler2(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  }
  response.writeHead(200, headers)

  if (networkStatus === 'ready') {
    response.write(`data: ${JSON.stringify({ text: 'end\n' })}\n\n`)
  } else {
    const watcher2 = chokidar.watch('../log_user_kill.txt')
    console.log('watcher started')
    watcher2.on('change', (event, path) => {
      //console.log(event, path);
      readLastLines.read('../log_user_kill.txt', 1).then(function (lines) {
        console.log(`${lines} reaad`)

        if (lines === 'end\n') {
          networkStatus = 'ready'
          watcher2.close()
        }

        response.write(`data: ${JSON.stringify({ text: lines })}\n\n`)
      })
    })
  }

  request.on('close', () => {
    console.log('connection closed')
    response.end()
  })
}

function eventsHandler(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  }
  response.writeHead(200, headers)

  if (networkStatus == 'running') {
    response.write(`data: ${JSON.stringify({ text: 'end\n' })}\n\n`)
  } else {
    const watcher = chokidar.watch('../log_user.txt')
    console.log('chokidhar start')
    watcher.on('change', (event, path) => {
      //console.log(event, path);
      console.log('line reaad')
      readLastLines.read('../log_user.txt', 1).then(function (lines) {
        if (lines === 'end\n') {
          networkStatus = 'running'
          watcher.close()
        }

        response.write(`data: ${JSON.stringify({ text: lines })}\n\n`)
      })
    })
  }

  request.on('close', () => {
    console.log('connection closed')
    response.end()
  })
}
app.get('/events', connectEnsureLogin.ensureLoggedIn('/login'), eventsHandler)
app.get('/events2', connectEnsureLogin.ensureLoggedIn('/login'), eventsHandler2)

app.get(
  '/testbed/stream',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    })
    res.flushHeaders()
    // res.render('stream');
    // let counter = 0;
    // const interval = setInterval(() => {
    // //   res.write("" + counter++);
    // //   fs.createReadStream("../logger.txt").pipe(res);
    //   fs.readFile('../logger.txt', 'utf8', (err, data) => {
    //     if (err) {
    //       console.error(err);
    //       return;
    //     }
    //     // res.write("" + counter++);
    //     res.write("\n"+ data);
    //     console.log(data);
    //   });
    // }, 1000);
    console.log('hi')
    tail = new Tail('../logger.txt')

    tail.on('line', function (data) {
      // console.log(data);
      res.write('\n' + data)
      if (data == 'EOF') {
        // res.redirect('stream2');
        res.end(data)
      }
    })

    tail.on('error', function (error) {
      console.log('ERROR: ', error)
      res.end()
    })

    res.on('close', () => {
      res.end()
    })
  }
)
app.get(
  '/testbed/stream2',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    })
    res.flushHeaders()
    // res.render('stream');
    let counter = 0
    const interval = setInterval(() => {
      res.write('\n' + counter++)
    }, 1000)

    res.on('close', () => {
      //   clearInterval(interval);
      res.end()
    })
  }
)

app.get(
  '/testbed/actions',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    if (networkStatus === 'running') {
      next()
    } else {
      next('route')
    }
  },
  function (req, res) {
    res.render('actions')
  }
)

app.get(
  '/testbed/actions',
  connectEnsureLogin.ensureLoggedIn('/login'),
  referer
)

app.get('/testbed/user_manual_out', function (req, res) {
  res.render('userManual_out')
})
app.get(
  '/testbed/user_manual',
  connectEnsureLogin.ensureLoggedIn('/login'),
  function (req, res) {
    res.render('userManual')
  }
)
// app.get("/testbed/remove_network",function(req,res){
//     res.render("remove_network");
// })

app.get(
  '/testbed/remove_network',
  connectEnsureLogin.ensureLoggedIn('/login'),
  function (req, res) {
    res.render('userManual')
  }
)

// /testbed/remove_network
function removeNetwork() {
  return new Promise((resolve, reject) => {
    const watcher_endremovelogs = chokidar.watch('../endremovelogs.txt')

    watcher_endremovelogs.on('change', (event, path) => {
      //console.log(event, path);
      console.log('line reaad')
      readLastLines.read('../endremovelogs.txt', 1).then(function (lines) {
        if (lines === 'end') {
          networkStatus = 'ready'

          watcher_endremovelogs.close()

          resolve()
        }
      })
    })
  })
}
app.post(
  '/testbed/remove_network',
  connectEnsureLogin.ensureLoggedIn('/login'),
  async function (req, res, next) {
    await ActiveSession.findByIdAndRemove(req.user._id)
    var finalString = 'kill'
    try {
      fs.writeFileSync('./../kill.txt', finalString)

      networkStatus = 'removelogs'

      res.redirect('/testbed/removelogs')
    } catch (error) {
      next(error)
    }
  }
)
app.post(
  '/admin/remove_network',
  connectEnsureLogin.ensureLoggedIn('/login'),
  async function (req, res, next) {
    await ActiveSession.findByIdAndRemove(req.body.removeUser)
    var finalString = 'kill'
    try {
      fs.writeFileSync('./../kill.txt', finalString)

      networkStatus = 'removelogs'
    } catch (error) {
      next(error)
    }
    res.redirect('/admin')
  }
  
)
app.post(
  '/testbed/monitor',
  connectEnsureLogin.ensureLoggedIn('/login'),
  function (req, res) {
    res.render('monitor')
  }
)

app.get('/testbed/about_out', function (req, res) {
  res.render('about_out')

  app.get(
    '/testbed/about',
    connectEnsureLogin.ensureLoggedIn('/login'),
    function (req, res) {
      res.render('about')
    }
  )
})
app.get(
  '/testbed/feedback',
  connectEnsureLogin.ensureLoggedIn('/login'),
  function (req, res) {
    res.render('feedback')
  }
)

app.post(
  '/testbed/feedback',
  connectEnsureLogin.ensureLoggedIn('/login'),
  async function (req, res) {
    // let d = new Date().toISOString();
  
    var feedback = req.body.feedback.toString()

    
    // var finalString= "Date:"+d +"  " + "Name:"+ name + "  "+"Address:"+ address +"  "+"Feedback:"+ feedback + "\n"

    // fs.appendFileSync("/home/user1/Try/feedback.txt",finalString, function(err) {
    //     if(err) {
    //         return console.log(err);
    //     }

    // });

    const feed = new Feedback({ feedback, user: req.user._id })

    await feed
      .save()
      .then((feed) => {
        // console.log(feed);

        //if (err) { return next(err); }
        res.redirect('/testbed/thankyou')
      })
      .catch((err) => {
        console.log(err.message)
        res.redirect('/testbed/feedback')
      })
  }
)

//fetching active sessions
app.get('/active-sessions',async (req,res)=>{
   
    
    console.log(sessions);
    res.redirect()
})

app.get('/feedback', async (req,res) => {
  const feedbacks = await feedback.find().populate('user')
  res.render('show_feedbacks',{feedbacks})

})

app.post('/remove-feedback',async (req,res) => {
  console.log(req.body.feedback);
  await feedback.findByIdAndRemove(req.body.feedback_id)
  res.redirect('/feedback')
})

let usersConnected = []

io.on('connection', (socket) => {
  
  socket.on('successfull_login',({userId, userIsAdmin})=> {
    console.log('user successfully login' , userId , userIsAdmin)
    usersConnected.push({
      socketId: socket.id,
      userId : userId,
      isAdmin : userIsAdmin
    })

    console.log(usersConnected)
    
  })
  socket.on('removeUser',({userId})=>{ 
    console.log('😊😊😊😊😊😊😊😊😊😊')
    console.log(usersConnected)
    console.log('😊😊😊😊😊😊😊😊😊😊')

    console.log(userId)
    const [{socketId}] = usersConnected.filter(userConnected => userConnected.userId === userId)
    
    // console.log('remove  user click' ,socketId)

    // console.log(socket.id) 
    socket.broadcast.to(socketId).emit('logoutUser');
    
  }) 

  socket.on('disconnect', () => {
    console.log('user disconnected')

  })
})


server.listen(8000, process.env.IP, function () {
  console.log('Server is listening')
  
})
