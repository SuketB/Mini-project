var express     =   require("express"),
    app         =   express(),
    bodyParser  =   require("body-parser"),
    mongoose    =   require("mongoose"),
    methodOverride= require("method-override"),
    fs = require('fs'),
    ts = require('tail-stream'), 
    Tail = require('tail').Tail;   
const expressSanitizer = require('express-sanitizer');

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.use(expressSanitizer());

app.get("/",function(req,res){
    res.render("new");
});

app.get("/testbed/thankyou",function(req,res){
    res.render("thankyou");
});

app.get("/testbed/join",function(req,res){
    
    
    var bootnode=fs.readFileSync('/home/user1/Try/bootnode.txt', 'utf8');
    console.log(bootnode);
    res.render('join', {bootnode: bootnode});


});


app.post("/",function(req,res){
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

    fs.writeFile("/home/user1/Try/block14.txt",finalString, function(err) {
        if(err) {
            return console.log(err);
        }
        fs.writeFile("/home/user1/Try/new_genesis.json",genesis, function(err1) {
            if(err1) {
                return console.log(err1);
            }
            
            console.log("The file was saved!");
            // return res.redirect("./views/new");
            res.redirect("/testbed/actions");
        }); 
    }); 
    
});


app.get("/testbed/actions",function(req,res){
    res.render("actions");
});


app.get("/testbed/user_manual",function(req,res){
    res.render("userManual");
});

// app.get("/testbed/remove_network",function(req,res){
// })

app.get("/stream", (req, res) => {
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
    const Tail = require('tail-file');

    const mytail = new Tail("../logger.txt"); // absolute or relative path

    mytail.on('error', err => console.log(err) );

    mytail.on('line', line => console.log(line) );

    mytail.on('ready', fd => console.log("All line are belong to us") );

    mytail.on('eof', pos => console.log("Catched up to the last line",pos) );

    mytail.on('skip', pos => console.log("myfile.log suddenly got replaced with a large file") );

    mytail.on('secondary', filename => console.log(`myfile.log is missing. Tailing ${filename} instead`) );

    mytail.on('restart', reason => {
    if( reason == 'PRIMEFOUND' ) console.log("Now we can finally start tailing. File has appeared");
    if( reason == 'NEWPRIME' ) console.log("We will switch over to the new file now");
    if( reason == 'TRUNCATE' ) console.log("The file got smaller. I will go up and continue");
    if( reason == 'CATCHUP' ) console.log("We found a start in an earlier file and are now moving to the next one in the list");
    });

    mytail.start();

    // tail = new Tail("../logger.txt");
    
    // tail.on("line", function(data) {
    // // console.log(data);
    // res.write('\n'+data);
    
    // });
    
    // tail.on("error", function(error) {
    // console.log('ERROR: ', error);
    // res.end();
    // });
    
    // res.on("close", () => {
    //   res.end();
    // });
    
  });
  app.get("/stream2", (req, res) => {
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
      res.write("" + counter++);
    }, 1000);
  
    
    res.on("close", () => {
    //   clearInterval(interval);
      res.end();
    });
    
  });
app.get("/testbed/remove_network",function(req,res){
    var tstream = ts.createReadStream('logger.txt', {
        beginAt: 0,
        onMove: 'follow',
        detectTruncate: true,
        onTruncate: 'end',
        endOnError: false
    });
    
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
      });
    res.flushHeaders();
    
    tstream.on('data', function(data) {
        console.log("got data: " + data);
        if (data=='log33') {
            console.log("success");
        } else {
            console.log("failure");
            console.log(JSON.stringify(data));
        }
        res.write(data);
    });
    
    tstream.on('eof', function() {
        console.log("reached end of file");
    });
    
    tstream.on('move', function(oldpath, newpath) {
        console.log("file moved from: " + oldpath + " to " + newpath);
    });
    
    tstream.on('truncate', function(newsize, oldsize) {
        console.log("file truncated from: " + oldsize + " to " + newsize);
    });
    
    tstream.on('end', function() {
        console.log("ended");
    });
    
    tstream.on('error', function(err) {
        console.log("error: " + err); 
    });
});

// /testbed/remove_network
app.post("/testbed/remove_network",function(req,res){  
    var finalString="kill";
    fs.writeFile("/home/user1/Try/kill.txt",finalString, function(err) {
        if(err) {
            return console.log(err);
        }
    }); 

    // res.render("new");
});

app.post("/testbed/monitor",function(req,res){
    res.render("monitor");
});

app.get("/testbed/about",function(req,res){
    res.render("about");
});

app.get("/testbed/feedback",function(req,res){
    res.render("feedback");
});

app.post("/testbed/feedback",function(req,res){  
    let d = new Date().toISOString();
    var name=req.body.name.toString();
    var address=req.body.address.toString();
    var feedback=req.body.feedback.toString();
    var finalString= "Date:"+d +"  " + "Name:"+ name + "  "+"Address:"+ address +"  "+"Feedback:"+ feedback + "\n"
    
    
    fs.appendFileSync("/home/user1/Try/feedback.txt",finalString, function(err) {
        if(err) {
            return console.log(err);
        }
            
    }); 
    res.redirect("/testbed/thankyou");
    // res.render("new");
});



app.listen(8000, process.env.IP, function(){
    console.log("Server is listening");
});
