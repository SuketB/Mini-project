var express     =       require("express"),
    app         =    express(),
    bodyParser  =   require("body-parser"),
    mongoose    =   require("mongoose"),
    methodOverride= require("method-override"),
    Tail = require('tail').Tail,
    fs = require('fs');
    
    const EventEmitter = require('events');
const session = require('express-session');  // session middleware
const readLastLines = require('read-last-lines');


const chokidar = require('chokidar');

const passport = require('passport');  // authentication
const connectEnsureLogin = require('connect-ensure-login'); //authorization


const User = require('./models/user.js'); // User Model 
const Feedback = require('./models/feedback.js'); //Feedback model

const expressSanitizer = require('express-sanitizer');
const { nextTick } = require("process");
const { MemoryStore } = require("express-session");
const { resolve } = require("path");

let currentUser;
let networkStatus;
const emmiter = new EventEmitter();


let loginCache=new Set();
let removedByAdmin=new Set();

var memstore= new MemoryStore();
var Mutex = require('async-mutex').Mutex;
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.use(expressSanitizer());


app.use(session({
    secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
    store:memstore,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24*60 * 60 * 1000 } // 1 day
  }));

  app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(User.createStrategy());

// To use with sessions
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
const mutex = new Mutex();
var count =0;



app.get('/signup', (req, res) => {
    res.render("signup",{messageoption:"hidden"});
  });

  app.get('/kick', (req, res,next) => {
   
    mutex.acquire().then(function(release){


      if(currentUser){

      memstore.get(currentUser,function (error,session){
  
        if(error)
        {
          
            release();
            return next(error);
        
        }
        
        else
        {
            if(session)
            {

              //  removedByAdmin push currentUser.sid

              removedByAdmin.add(currentUser);
              

            
              if(networkStatus==='ready')
              {

                //for now send a response
                res.send("logout at ready");
                loginCache.delete(currentUser);
                currentUser=undefined;
                
                
                release();

              }
              else if(networkStatus==='createlogs')
              {
                  emmiter.on('endcreatelogs', () => {


                    var finalString="kill";
                    fs.writeFile("./../kill.txt",finalString, function(err) {
                        if(err) {
                          console.log(err);

                          release();

                            return next(err);


                        }
                        const adminwatcher=chokidar.watch('../logger2.txt');
                        adminwatcher.on('change', (event, path) => {

      
                          //console.log(event, path);
                          console.log("line reaad");
                            readLastLines.read("../logger2.txt", 1)
                            .then(function(lines){

                              console.log(lines);
                              
                              if(lines==="end")
                              {
                    
                                adminwatcher.close();

                                res.send("logout at createlogs");
                                loginCache.delete(currentUser);
                                currentUser=undefined;
                                
                                
                                release();
                                   //send message to ajax

                              }
                                          
                            });
                            
                          });

                          }); 
                 
                });
              }
              else if(networkStatus==='running')
              {
                var finalString="kill";
                fs.writeFile("./../kill.txt",finalString, function(err) {
                    if(err) {
                      release();
                      console.log(err);
                        return next(err);

                    }
                    const adminwatcher2=chokidar.watch('../logger2.txt');
                    adminwatcher2.on('change', (event, path) => {

  
                      //console.log(event, path);
                      console.log("line reaad");
                        readLastLines.read("../logger2.txt", 1)
                        .then(function(lines){
                          
                          if(lines==="end")
                          {
                
                                adminwatcher2.close();

                                res.send("logout at running");
                                loginCache.delete(currentUser);
                                currentUser=undefined;
                                
                                
                                release();

                               //send message to ajax

                          }
                                      
                        });
                        
                      });

                      }); 

                    }

              else if(networkStatus==='removelogs')
              {
                currentUser.emmiter.on('endremovelogs', () => {


                  res.send("logout at removelogs");
                                loginCache.delete(currentUser);
                                currentUser=undefined;
                                
                                
                                release();
                  //send message to ajax
               
              });
              }
              
            }
            else
            {
                  //for now send a response


            release();
            res.send("no user is logged in");
            //no one to log out;
            }
            
        }
        
        
        });
      }
      else
      {

        //for now send a response


        release();
        res.send("no user is logged in");
        //no one to log out;

      }

      
      
    }).catch((err)=>{
      return next(err);
    });
  });


app.get('/login', (req, res) => {

  memstore.length((function (err, size){
    if(err)
    {
      console.log('errors');
    }
    else
    {
     console.log(size);
    }
  }));

 
    console.log(req.sessionID);
    res.render("login",{modaloption:"hide",messageoption:"hidden"});
  });



  app.post('/signup', (req, res) => {
    
    User.register(new User({username: req.body.username}), req.body.password, (err, user) => {
      if(err) {
        console.log(err);
        res.render("signup",{messageoption:"visible"});
      } else {
        
        res.redirect('/login');
      }

    }
    )
  });


  function singleUserLogin(req,res,next)
  {
  
    mutex.acquire().then(function(release){
          function getPromise(sid)
          {
              return new Promise(function (resolve,reject){
  
                  memstore.get(sid,function (error,session){
  
                      if(error)
                      {
                      
                          reject(error);
                      
                      }
                      
                      else
                      {
                          
                          resolve([sid,session]);
                      }
                      
                      
                      });
  
  
  
  
              });
          }
  
  
             
          
  
            let promiseArray=[];
            
            console.log(loginCache);
            
            
            for(const sid of loginCache.values()){
            
                promiseArray.push(getPromise(sid));
            
            
            
            
            }
            
            
            Promise.all(promiseArray).then((sessionArray)=>{
            
            
            
                for(const x of sessionArray.values()){
            
            
                    if(x[1])
                    {
                      release();
                        return next('route');
                    }
                    else
                    {
                        loginCache.delete(x[0]);
                    }
            
            
            
                    
            
            }
            req.release=release;
            next();
            }
            
            ).catch((err) => {
                    console.error(err);
                    release();
                    next(err);
                  });
            
  
  });
}

  app.post('/login',singleUserLogin, function(req,res,next)
  {
  passport.authenticate('local',(err,user,info)=>{
  
    if(err){
      req.release();
      delete req.release;
      return next(err);}
  
    if(!user){
          req.release();
      delete req.release;
      return res.render("login",{modaloption:"hide",messageoption:"visible"});}
  
    req.logIn(user,function(err)
    {
  
    if(err){ 
      req.release();
	    delete req.release;
      return next(err);}
  
    return next();
  
    });
  
    } )(req,res,next);
  },function(req, res) {

    loginCache.add(req.sessionID);
    currentUser=req.sessionID;
    networkStatus="ready";
      req.release();
      delete req.release;
      console.log(req.user)
      
      
      res.redirect('/');

    });

    app.post('/login', (req,res) =>{

			res.render("login",{modaloption:"show",messageoption:"hidden"});
			});

app.get('/logout', (req, res) => {
	
  req.logout(function(err) {
    //if (err) { return next(err); }
    res.redirect('/login');
  }
  
  );
  });

app.get("/",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    

  console.log(req.sessionID);

    res.render("new");
});

app.get("/testbed/thankyou",function(req,res){
    res.render("thankyou");
});

app.get("/testbed/join",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    
    
    var bootnode=fs.readFileSync('../bootnode.txt', 'utf8');
    console.log(bootnode);
    res.render('join', {bootnode: bootnode});


});


app.post("/",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    var mode = req.body.mode.toString();
    var flags = req.body.flags.toString();
    var genesis = req.body.genesis.toString();
    var server = req.body.Server.toString();
    var raspberry3 = req.body.Raspberry3.toString();
    var raspberry4 = req.body.Raspberry4.toString();
    var android = req.body.Android.toString();
    var finalString = "number of server nodes="+server + "\n" +"number of raspberry3 nodes="+ raspberry3 + "\n" +"number of raspberry4 nodes="+raspberry4 + "\n" +"number of android nodes="+ android+ "\n" +"mode="+ mode + "\n"  +"additional flags="+ flags + "\n" ;
  
//   genesis validation for errors
//   geth flags validation for errors.....consensus 

    fs.writeFile('./../block14.txt',finalString, function(err) {
        if(err) {
            return console.log(err);
        }
        fs.writeFile("/home/suhaib/Desktop/Blockchain_Testbed_Frontend-main/Try/new_genesis.json",genesis, function(err1) {
            if(err1) {
                return console.log(err1);
            }
            
            console.log("The file was saved!");
            // return res.redirect("./views/new");

            networkStatus="createlogs";

            
      const watcher_endcreatelogs=chokidar.watch('../endcreatelogs.txt');

      watcher_endcreatelogs.on('change', (event, path) => {

      
      //console.log(event, path);
      console.log("line reaad");
        readLastLines.read('../endcreatelogs.txt', 1)
        .then(function(lines){
          
          if(lines==="end")
          {

            emmiter.emit('endcreatelogs');
            networkStatus="running";
            
            
            watcher_endcreatelogs.close();
          }
          
          
          
          
        });
        
      });


            res.redirect('/testbed/createlogs');
        }); 
    }); 
    
});

app.get('/testbed/createlogs',connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("logs",{endpoint:"/events"});


    });

    app.get('/testbed/removelogs',connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
      res.render("logs",{endpoint:"/events2"});
  
  
      });



function eventsHandler2(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);



  if(networkStatus==='ready')
  {
    response.write(`data: ${JSON.stringify({text:"end"})}\n\n`);
  }
  else{

  

      const watcher2=chokidar.watch('../logger2.txt');

      watcher2.on('change', (event, path) => {

      
      //console.log(event, path);
      console.log("line reaad");
        readLastLines.read("../logger2.txt", 1)
        .then(function(lines){
          
          if(lines==="end")
          {
            watcher2.close();
          }
          
          
          response.write(`data: ${JSON.stringify({text:lines})}\n\n`)
          
        });
        
      });
  }
  

  request.on('close', () => {
    
  
  console.log("connection closed");
  response.end();
  });
}

function eventsHandler(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);



  if(networkStatus=='running')
  {
    response.write(`data: ${JSON.stringify({text:"end"})}\n\n`);
  }
  else{

  

      const watcher=chokidar.watch('../logger.txt');

      watcher.on('change', (event, path) => {

      
      //console.log(event, path);
      console.log("line reaad");
        readLastLines.read("../logger.txt", 1)
        .then(function(lines){
          
          if(lines==="end")
          {

            
            
            request.session.isEnd=true;
            request.session.save();
            
            watcher.close();
          }
          
          
          response.write(`data: ${JSON.stringify({text:lines})}\n\n`)
          
        });
        
      });
  }
  

  request.on('close', () => {
    
  
  console.log("connection closed");
  response.end();
  });
}
app.get('/events',connectEnsureLogin.ensureLoggedIn('/login'),eventsHandler);
app.get('/events2',connectEnsureLogin.ensureLoggedIn('/login'),eventsHandler2);

app.get("/testbed/stream",connectEnsureLogin.ensureLoggedIn('/login'), (req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
    });
    res.flushHeaders();
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
    tail = new Tail("../logger.txt");
    
    tail.on("line", function(data) {
    // console.log(data);
    res.write('\n'+data);
    if (data=='EOF'){
        // res.redirect('stream2');
        res.end(data);
        
        
    }
    
    });
    
    tail.on("error", function(error) {
    console.log('ERROR: ', error);
    res.end();
    });
    
    res.on("close", () => {
      res.end();
    });
    
  });
  app.get("/testbed/stream2", connectEnsureLogin.ensureLoggedIn('/login'),(req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
    });
    res.flushHeaders();
    // res.render('stream');
    let counter = 0;
    const interval = setInterval(() => {
      res.write("\n" + counter++);
    }, 1000);
    
    
    res.on("close", () => {
    //   clearInterval(interval);
      res.end();
    });
    
  });
app.get("/testbed/actions",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("actions");
});


app.get("/testbed/user_manual",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("userManual");
});
// app.get("/testbed/remove_network",function(req,res){
//     res.render("remove_network");
// })

app.get("/testbed/remove_network",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("userManual");
});

// /testbed/remove_network
app.post("/testbed/remove_network",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){  
    var finalString="kill";
    fs.writeFile("./../kill.txt",finalString, function(err) {
        if(err) {
            return console.log(err);
        }

        networkStatus="removelogs";

            
        const watcher_endremovelogs=chokidar.watch('../endremovelogs.txt');
  
        watcher_endremovelogs.on('change', (event, path) => {
  
        
        //console.log(event, path);
        console.log("line reaad");
          readLastLines.read('../endremovelogs.txt', 1)
          .then(function(lines){
            
            if(lines==="end")
            {
  
              emmiter.emit('endremovelogs');
              networkStatus="ready";
              
              
              watcher_endremovelogs.close();
            }
            
            
            
            
          });
          
        });

      res.redirect('/testbed/removelogs');
    }); 



     
});

app.post("/testbed/monitor",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("monitor");
});

app.get("/testbed/about",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("about");
});

app.get("/testbed/feedback",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){
    res.render("feedback");
});

app.post("/testbed/feedback",connectEnsureLogin.ensureLoggedIn('/login'),function(req,res){  
    // let d = new Date().toISOString();
    var name=req.body.name.toString();
    var address=req.body.address.toString();
    var feedback=req.body.feedback.toString();
    // var finalString= "Date:"+d +"  " + "Name:"+ name + "  "+"Address:"+ address +"  "+"Feedback:"+ feedback + "\n"
    
    
    // fs.appendFileSync("/home/user1/Try/feedback.txt",finalString, function(err) {
    //     if(err) {
    //         return console.log(err);
    //     }
      
    // }); 



    Feedback.create({
        name:req.body.name,

        address:req.body.address,
      
        feedback:req.body.feedback,

        username:req.session.passport.user




    }).then((feed) => {
        // console.log(feed);
        req.logout(function(err) {
        //if (err) { return next(err); }
        res.redirect('/testbed/thankyou');
      }
      
      );
    }).catch((err) => {


        console.log(err.message);
        res.redirect("/testbed/feedback");
    })
    
});



app.listen(8000, process.env.IP, function(){
    console.log("Server is listening");
});
