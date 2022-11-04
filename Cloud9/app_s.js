var express     =       require("express"),
    app         =    express(),
    bodyParser  =   require("body-parser"),
    mongoose    =   require("mongoose"),
    methodOverride= require("method-override"),
    fs = require('fs'),
    Tail = require('tail').Tail;
    
const expressSanitizer = require('express-sanitizer');

app.set("view engine", "ejs");
app.use(express.static("public"));
// app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
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

// app.get('/ajax',function(req, res){
//     res.render('ajax', {title: 'An Ajax Example', quote: "AJAX is great!"});
// });
app.get('/ajax3',function(req, res){
    // tail = new Tail("log.txt");
    // tail.on("line", function(data) {
    // // console.log(data);
    // res.send({response: data});
    
    // });
    // const stream = fs.createReadStream('log.txt');
    // stream.pipe(res);
    // fs.readFile('log.txt', 'utf8', (err, data) => {
    // if (err) {
    //     console.error(err);
    //     return;
    // }
    // console.log(stream.pipe(res));
    // res.send({response: stream.pipe(res)});
    // });
    res.setHeader("content-type", "txt");
    fs.createReadStream("../logger.txt").pipe(res);
        

    // tail.on("error", function(error) {
    // console.log('ERROR: ', error);
    // });
    console.log("Current directory:", __dirname);
    console.log(req.body.quote);
    // res.send({response: req.body.quote});
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
//     res.render("remove_network");
// })

app.get("/testbed/remove_network",function(req,res){
    res.render("userManual");
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
