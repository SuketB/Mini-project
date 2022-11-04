var express     =       require("express"),
    app         =    express(),
    bodyParser  =   require("body-parser"),
    mongoose    =   require("mongoose"),
    methodOverride= require("method-override"),
    Tail = require('tail').Tail,
    fs = require('fs');
    

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

let loginCache=new Set();
var memstore= new MemoryStore();

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

var count =0;
app.get('/signup', (req, res) => {
    res.render("signup",{messageoption:"hidden"});
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
    res.render("login",{modaloption:"show",messageoption:"visible"});
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



  app.post('/login',passport.authenticate('local', { failureRedirect: '/login' }),  function(req, res) {
	
 
    
    res.redirect('/');
  

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
    
    console.log("hello everyone");
    var enode=fs.readFileSync('../enode.txt', 'utf8');
    var genesis=fs.readFileSync('../genesis_user.json', 'utf8');
    console.log(enode);
    
    console.log(genesis);
    // var data= JSON.stringify({enode: enode, genesis: genesis}); 
    // console.log(data);
    // bootnode= enode;
    res.render("join", { bootnode: genesis })
    // res.render('join', { sim: enode });


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
            res.redirect("/testbed/logs");
        }); 
    }); 
    
});

app.get('/testbed/logs',connectEnsureLogin.ensureLoggedIn('/login'), (req, res) => {
  res.render("logs");
});


function eventsHandler(request, response) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);



  if(request.session.isEnd&&request.session.isEnd===true)
  {
    response.write(`data: ${JSON.stringify({text:"end"})}\n\n`);
  }
  else{

  

      const watcher=chokidar.watch('../logger.txt');

      watcher.on('change', (event, path) => {

      
      //console.log(event, path);
      console.log("line read");
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
    }); 

    // res.render("new");
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
