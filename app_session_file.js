let express = require('express')
, session = require('express-session')
, bodyParser = require('body-parser')
, FileStore = require('session-file-store')(session);

let exp = express();

exp.use(bodyParser.urlencoded({ extended: false }));

exp.use(session({
    secret: '12#$@#cdvx',
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));

var users = [
    {
        username: 'egoing',
        password: '111',
        displayName: 'Egoing'
    }
];


exp.get('/auth/login', (req,res)=>{
    var output = `
        <h1>Log-in</h1>
        <form action="/auth/login" method="post">
            <p>
                <input type="text" name="username" placeholder="username">
            </P>
            <p>
                <input type="password" name="password" placeholder="password">
            </p>
            <p>
                <input type="submit">
            </p>
        </form>
    `;
    res.send(output);
});

exp.post('/auth/login', (req,res)=>{
    var uname = req.body.username
    , pwd = req.body.password;
    for(var i=0;i<users.length;i++){
        var user = users[i];
        if(uname === user.username && pwd === user.password){
            req.session.displayName = user.displayName;
            return req.session.save(()=>{  // 세션이 안전하게 저장이 된 후 redirection. // return으로 인해 일치하는 계정을 찾으면 반복을 중지하고 redirect를 실행. return 위치 주의
                res.redirect('/welcome');  
            });
            
        }
    }
    res.send('who are you? <a href="/auth/login">login</a>');
    
});

exp.get('/welcome', (req,res)=>{
    if(req.session.displayName){
        res.send(`
        <h1>hello, ${req.session.displayName}</h1>
        <a href="/auth/logout">logout</a>
        `);
    } else{
        res.send(`
        <h1>Welcome</h1>
        <ul>
            <li><a href="/auth/login">login</a></li>
            <li><a href="/auth/register">register</a></li>
        </ul>
        `);
    }
});

exp.get('/auth/register', (req,res)=>{
    var output = `
    <h1>Register</h1>
        <form action="/auth/register" method="post">
            <p>
                <input type="text" name="username" placeholder="username">
            </P>
            <p>
                <input type="password" name="password" placeholder="password">
            </p>
            <p>
                <input type="displayName" name="displayName" placeholder="displayName">
            </p>
            <p>
                <input type="submit">
            </p>
        </form>
    `;
    res.send(output);
});


exp.post('/auth/register', (req,res)=>{
    var user = {
        username:req.body.username,
        password:req.body.password,
        displayName:req.body.displayName
    };
    users.push(user);
    res.session.displayName = req.body.displayName;
    res.session.save(()=>{
        res.redirect('/welcome');
    });
});

exp.get('/auth/logout', (req,res)=>{
    delete req.session.displayName;
    res.redirect('/welcome');
});

exp.listen(3003, ()=>{
    console.log('3003번 포트가 시작되었습니다.');
});