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
var moment = require('moment') //moment library for date time related operations

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const models = require('./models/user.js') //importing user schema and slot schema
const User = models.userModel // User Model
const Slots = models.slotsModel //slot model
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
function notificationHandler(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  }
  response.writeHead(200, headers)

  function onLogoutWarning() {
    response.write(
      `data: ${JSON.stringify({
        text: 'you session will be expiring soon',
        class: 'warning',
        title: 'Hurry!',
      })}\n\n`
    )
  }
  function onAutologout() {
    response.write(
      `data: ${JSON.stringify({
        text: 'your session has ended',
        class: 'error',
        title: 'Logged out!',
      })}\n\n`
    )
  }

  let intervalID
  if (!intervalID) {
    intervalID = setInterval(() => {
      response.write(`data: ${JSON.stringify({ text: 'noise' })}\n\n`)
    }, 1000)
  }
  emitter.on('logout_warning' + request.sessionID, onLogoutWarning)
  emitter.on('autologout' + request.sessionID, onAutologout)

  request.on('close', () => {
    clearInterval(intervalID)
    intervalID = null
    emitter.off('logout_warning' + request.sessionID, onLogoutWarning)
    emitter.off('autologout' + request.sessionID, onAutologout)
    console.log('notification connection closed')
    response.end()
  })
}

//for testing purposes every hour corresponds to slot 1
function getSlotNumber() {
  //function to convert current local time to slot number with momentjs library
  var a = 0 //no slot
  if (moment().hour() >= 0 && moment().hour() <= 23) {
    a = 1 //morning slot 8am to 9am
  } else if (moment().hour() >= 21 && moment().hour() <= 23) {
    a = 2 //evening slot 8pm to 9pm
  }

  return a
}

//fucntion to authorize the user that he have a slot
function userHaveSlot(req, res, next) {
  if (req.sessionID === currentUser) {
    next()
  } else res.redirect('/booking')
}
// this middleware redirects to respective pages depending upon networkStatus variable
function referer(req, res, next) {
  console.log('referer redirecting')
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


app.get('/signup', (req, res) => {
  res.render('signup', { messageoption: 'hidden' })
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
          waitforcreateNetwork().then(() => {
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

function valid_cred(req) {
  let user_name_str = req.body.username
  let pwd_str = req.body.password
  let email_str = req.body.email
  let int_str = req.body.institute

  if (pwd_str.length < 8 || pwd_str.length > 15) {
    //password size must be from 8 to 15
    console.log('password 8 to 15!!!')

    res.json({ response: 'password 8 to 15!!!' })

    return false
  }
  let is_lower = false
  let is_upper = false
  let is_int = false
  let is_special = false
  for (let i = 0; i < pwd_str.length; i++) {
    let cur = pwd_str[i]
    if (cur >= 'a' && cur <= 'z') {
      is_lower = true
    } else if (cur >= 'A' && cur <= Z) {
      is_upper = true
    } else if (cur >= '0' && cur <= '9') {
      is_int = true
    } else {
      is_special = true
    }
  }
  if (!is_special && is_lower && is_int && is_upper) {
    //correct
  } else {
    //passwod must conatain intger upper and lower case alphabets
    console.log('passwod must conatain intger upper and lower case alphabets')
    res.json({
      response: 'password must conatain intger upper and lower case alphabets',
    })
    return false
  }

  return true
}
app.post('/signup', (req, res) => {
  //console.log(req.body)
  let valid_chek = valid_cred(req)

  User.register(
    new User({
      username: req.body.username,
      email: req.body.email,
      institute: req.body.institute,
    }),
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
    // if the user logging in have a slot in database populate the variables
    Slots.findOne(
      {
        username: req.user.username,

        date: moment().format('YYYY-MM-DD'),
        slotNumber: getSlotNumber(),
      },
      function (err, obj) {
        if (err) return next(err)

        if (obj) {
          currentUser = req.sessionID
          currentUserName = req.user.username
          networkStatus = 'ready'

          currentSlot = obj

          //here we set the time after how much time the user will be logged out automatically
          setTimeout(() => {
            emitter.emit('logout_warning' + req.sessionID)
          }, 3 * 60 * 1000)

          setTimeout(() => {
            emitter.emit('autologout' + req.sessionID)
            kick().catch((err) => {
              console.log(err)
            })
          }, 3 * 60 * 1000 + 1000)
        }
        // res.redirect('/')
        res.json({ success: true, redirect: '/' })
      }
    )
  }
)



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

app.get(
  '/booking',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    Slots.find({}, (err, slots) => {
      //all slots in database are queried

      if (err) return next(err)

      var events = [] //this will store events in the format required for fullcalender.io package
      slots.forEach((slot) => {
        //console.log (typeof moment(slot.date).format('YYYY-MM-DD'));
        if (slot.username === req.user.username)
          events.push({
            start: slot.date,
            title: `you have booked slot ${slot.slotNumber}`,
          })
        else
          events.push({
            start: slot.date,
            title: `slot ${slot.slotNumber} is already booked`,
          })
      })

      res.render('booking', { slotList: JSON.stringify(events) }) //page rendered with all slots
    })
  }
)


//booking endpoint
app.post('/booking', (req, res, next) => {
  //finding the to be booked slot in database
  Slots.findOne(
    {
      date: req.body.date,

      slotNumber: req.body.slot,
    },
    function (err, doc) {
      if (err) {
        console.log(err)
        return res.status(500).json({ success: false })
      }

      //if already exists respond with json
      if (doc) {
        return res.json({ success: true, message: 'Slot already booked' })
      }
      //else book slot
      else {
        console.log(getSlotNumber())

        if (
          1 ==
          2 /*req.body.date===moment().format('YYYY-MM-DD')&& Number(req.body.slot)==getSlotNumber(moment().hour())*/
        ) {
          return res.json({ success: true, message: 'Slot expired' })
        } else {
          const slot = new Slots({
            username: req.user.username,

            date: req.body.date,

            slotNumber: req.body.slot,
            user: req.user._id,
          })

          slot.save((err) => {
            if (err) return res.status(500).json({ error: err, success: false })

            return res.json({
              success: true,
              message: 'Slot booked successfully',
            })
          })
        }
      }
    }
  )
})



app.get(
  '/logout',
  connectEnsureLogin.ensureLoggedIn('/login'),
  (req, res, next) => {
    if (req.sessionID === currentUser) {
      if (networkStatus === 'ready') {
        mutex.acquire().then(function (release) {
          memstore.destroy(currentUser, (err) => {
            if (err) {
              release()
              return next(err)
            }

            Slots.deleteOne(currentSlot)
              .then(() => {
                //deletes the currentSlot here.

                currentUser = undefined
                networkStatus = undefined
                currentSlot = {}

                release()

                return res.json({ success: true, redirect: '/login' })
              })
              .catch((err) => {
                release()
                return next(err)
              })
          })
        })
      }

      if (networkStatus === 'createlogs') {
        res.json({
          success: true,
          message: 'Logs are being generated.Try after removing the network',
          redirect: '/login'
        })
      }

      if (networkStatus === 'removelogs') {
        res.json({
          success: true,
          message: 'Logs are being generated.Wait until network is removed',
          redirect: '/login',
        })
      }

      if (networkStatus === 'running') {
        res.json({ success: true, message: 'remove the network first',redirect: '/login'}
        )
      }
    } else {
      req.logout(function (err) {
        if (err) {
          return next(err)
        }


        res.json({ success: true, redirect: '/login' })
      })
    }

    //logout endpoint also calls kick()
  }
)

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

app.get('/', connectEnsureLogin.ensureLoggedIn('/login'),userHaveSlot, referer)

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

function waitforcreateNetwork() {
  return new Promise((resolve, reject) => {
    console.log('waitforcreateNetwork function called..also reading file')
    const watcher_endcreatelogs = chokidar.watch('../log_user.txt')

    watcher_endcreatelogs.on('change', (event, path) => {
      console.log(event, path)

      console.log('line reaad by waitforcreateNetwork ')
      readLastLines.read('../log_user.txt', 1).then(function (lines) {
        if (lines === 'end' || lines === 'end\n') {
          watcher_endcreatelogs.close()

          resolve()
        }
      })
    })
  })
}

app.post(
  '/',
  connectEnsureLogin.ensureLoggedIn('/login'),
  async function (req, res) {
    let date_ob = new Date()

    // current date
    // adjust 0 before single digit date
    let date = ('0' + date_ob.getDate()).slice(-2)

    // current month
    let month = ('0' + (date_ob.getMonth() + 1)).slice(-2)

    // current year
    let year = date_ob.getFullYear()

    // current hours
    let hours = date_ob.getHours()

    // current minutes
    let minutes = date_ob.getMinutes()

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
  }
)

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
    const user = await User.findById(req.user._id)

    res.render('logs', {
      endpoint: '/events',
      redirect: '/testbed/actions',
      user,
    })
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
app.get('/active-sessions', async (req, res) => {
  console.log(sessions)
  res.redirect()
})

app.get('/feedback', async (req, res) => {
  const feedbacks = await feedback.find().populate('user')
  res.render('show_feedbacks', { feedbacks })
})

app.post('/remove-feedback', async (req, res) => {
  console.log(req.body.feedback)
  await feedback.findByIdAndRemove(req.body.feedback_id)
  res.redirect('/feedback')
})

let usersConnected = []

io.on('connection', (socket) => {
  socket.on('successfull_login', ({ userId, userIsAdmin }) => {
    console.log('user successfully login', userId, userIsAdmin)
    usersConnected.push({
      socketId: socket.id,
      userId: userId,
      isAdmin: userIsAdmin,
    })

    console.log(usersConnected)
  })
  socket.on('removeUser', ({ userId }) => {
    console.log('😊😊😊😊😊😊😊😊😊😊')
    console.log(usersConnected)
    console.log('😊😊😊😊😊😊😊😊😊😊')

    console.log(userId)
    const [{ socketId }] = usersConnected.filter(
      (userConnected) => userConnected.userId === userId
    )

    // console.log('remove  user click' ,socketId)

    // console.log(socket.id)
    socket.broadcast.to(socketId).emit('logoutUser')
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(8000, process.env.IP, function () {
  console.log('Server is listening')
})
