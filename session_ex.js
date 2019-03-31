const express = require('express')
, session = require('express-session')
, bodyParser = require('body-parser')
, FileStore = require('session-file-store')(session)
, bkfd2Password = require('pbkdf2-password');

let exp = express();

exp.use(bodyParser.urlencoded({ extended: false }));

exp.use(session({
    secret: 'asdf1234@@',
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));

var hasher = bkfd2Password(); //

var users = [
    {
        username: 'egoing',
        password: 'uW8wtDfOZclSXdOBHmgsFGRE2zDNfDEVuJ9o/66GdN68y1yN0nWTzhBAa8sl7nPo3kTpxVSI/gG9jInuml5F3VAoMkRGviBHh3keZFeBo4aRgBQnoPgN5Y8ovU0DEL0X+5p5kh/RvVMuLlZ1g+yagF5cGVmjtY2mSqzNZSu5BnU=', 
        displayName: 'EGOING',
        salt: 'unagtHzN52ARFiDJXEnkiccQvqJhded965woQwxuD/wDMPQpyp7axoz4mcYfgD/BEGSV79f200P30mnuoW573w=='  
    }
];

exp.get('/auth/login', (req, res)=>{
    var output = `
    <h1>로그인</h1>
    <form action="/auth/login" method="post">
        <p>
            <input type="text" name="username" placeholder="username">
        </p>
        <p>
            <input type="text" name="password" placeholder="password">
        </p>
        <p>
            <input type="submit">
        </p>
    </form>
    `;
    res.send(output);
});

exp.post('/auth/login', (req,res)=>{
    var username_input = req.body.username
    , password_input = req.body.password;

    for(var i=0; i<users.length; i++){
        var user = users[i];  //
        if(username_input === user.username){
            return hasher({password:password_input, salt:user.salt}, (err, pass, salt, hash)=>{  // return: 콜백으로 인해 for문이 다 돌고 who are you?를 출력한 뒤 hasher 안의 콜백함수를 실행할 가능성을 차단하기 위함.
                if(hash === user.password){
                    req.session.displayName = user.displayName;
                    req.session.save(()=>{
                        res.redirect('/welcome');
                    });
                } else{
                    res.send('Who are you? <a href="/auth/login">로그인</a>');

                }
            });
        }
    }
    res.send('Who are you? <a href="/auth/login">로그인</a>');
});

exp.get('/welcome', (req,res)=>{
    if(req.session.displayName){
        res.send(`
            <h1>안녕하세요! ${req.session.displayName}님!</h1>
            <a href="/auth/logout">로그아웃</a>
        `);
    } else{
        res.send(`
            <h1>welcome page</h1>
            <ul>
                <li><a href="/auth/login">로그인</a></li>
                <li><a href="/auth/register">회원가입</a></li>
            </ul>
        `);
    }
});

exp.get('/auth/register', (req,res)=>{
    var output = `
        <h1>회원가입</h1>
        <form action="/auth/register" method="post">
        <p>
        <input type="text" name="username" placeholder="username">
        </p>
        <p>
            <input type="text" name="password" placeholder="password">
        </p>
        <p>
            <input type="text" name="displayName" placeholder="displayName">
        </p>
        <p>
            <input type="submit">
        </p>
    </form>
    `
    res.send(output);
});

exp.post('/auth/register', (req,res)=>{
    hasher({password:req.body.password}, (err, pass, salt, hash)=>{  // hash로 변환을 한 뒤 user_new 객체를 형성하는 것이 맞는 순서이므로 콜백 안에 넣는다.
        var user_new = {
            username: req.body.username,
            password: hash,  // 변환된 hash값
            salt: salt,  // salt가 있어야 해독 가능
            displayName: req.body.displayName
        };
        users.push(user_new);
        req.session.displayName = req.body.displayName;
        req.session.save(()=>{
            res.redirect('/welcome');
        });
    });
});

exp.get('/auth/logout', (req,res)=>{
    delete req.session.displayName;
    res.redirect('/welcome');
});

exp.listen(3000, ()=>{
    console.log('3002번 포트가 연결되었습니다.');
});