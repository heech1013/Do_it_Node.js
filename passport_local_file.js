const express = require('express')
, session = require('express-session')
, bodyParser = require('body-parser')
, FileStore = require('session-file-store')(session)
, bkfd2Password = require('pbkdf2-password')
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy;


let exp = express();

exp.use(bodyParser.urlencoded({ extended: false }));

exp.use(session({
    secret: 'asdf1234@@',
    resave: false,
    saveUninitialized: true,
    // store: new FileStore()  // 주석처리해야 deserializeUser()가 작동된다.
}));

exp.use(passport.initialize());  // 초기화. passport.js 페이지 등 참고
exp.use(passport.session());  // exp.use(session(~))뒤에 와야 함.

var hasher = bkfd2Password();

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

passport.serializeUser((user, done)=>{  // 첫번째 인자 user는 로그인이 성공하였을 때 done(null, user)로부터 user값을 전달 받음. LocalStrategy()의 done과 다른 done이다.
    console.log('serializeUser', user);
    done(null, user.username);  // 유저 각각을 구분하는 식별자를 두 번째 인자로 전달. 최초 로그인에 한하여 session에 사용자의 식별자로서 저장
  });
  
passport.deserializeUser((id, done)=>{  // serializeUser()로 인해 한 번 로그인에 성공하여 session에 사용자의 세션 값(user.username)이 저장되어 있다면, 다음에 로그인할 때(?)는 desrializeUser()가 실행됨(?). serializeUser의 done 콜백함수의 user.username 값이 id 값으로 들어옴
    console.log('deserializeUser', id);
    for(var i=0; i<users.length; i++){
        var user = users[i];
        if(user.username === id){
            return done(null, user);  // 여기서의 user 객체는 req.user 객체가 된다.
        }
    }
  });

passport.use(new LocalStrategy(  // local strategy를 통해 로그인을 수행하는 데 필요한 객체를 생성
    (username, password, done)=>{
        var username_input = username  // username으로 기본 변수가 설정되어 있다.
        , password_input = password;  // password 기본 변수 설정.
        for(var i=0; i<users.length; i++){
            var user = users[i];
            if(username_input === user.username){
                return hasher({password:password_input, salt:user.salt}, (err, pass, salt, hash)=>{  // return: 콜백으로 인해 for문이 다 돌고 who are you?를 출력한 뒤 hasher 안의 콜백함수를 실행할 가능성을 차단하기 위함.
                    if(hash === user.password){
                        console.log('LocalStrategy', user);
                        done(null, user);  // 로그인이 완료되었을 때 함수 done(). user는 사용자 정보가 담긴 객체(false가 아닌 값). null은 에러와 관련된 부분, 복잡해서 패스. 로그인이 성공되면 passport.serializeUser()가 실행되며 두번째 인자의 user가 첫번째 인자의 user로 전달됨..
                    } else{
                        done(null, false);  // 로그인이 실패
                    }
                });
            }
        }
        done(null, false);
    }
));

exp.post('/auth/login',
    passport.authenticate(  // 미들웨어. 콜백함수를 return한다.
        'local',  // local strategy로 로그인이 진행. login, logout, register 모두 passport-local 방식으로 바꿔야 한다.
        {
            successRedirect: '/welcome',  // 로그인을 성공했을 때 이동할 라우터
            failureRedirect: '/auth/login',  // 실패했을 때
            failureFlash: false  // 로그인에 실패했다는 메시지를 띄우는 기능. 복잡하여 패스함
        }
    )
);

exp.get('/welcome', (req,res)=>{
    if(req.user && req.user.displayName){  // passport 객체는 req 객체에 (원래는 없던) user 객체를 생성한다. 이 객체는 deserializeUser()의 done()의 user 객체이다.
        res.send(`
            <h1>안녕하세요! ${req.user.displayName}님!</h1>
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
    hasher({password:req.body.password}, (err, pass, salt, hash)=>{ 
        var user_new = {
            username: req.body.username,
            password: hash,  
            salt: salt,  
            displayName: req.body.displayName
        };
        users.push(user_new);
        req.login(user_new, (err)=>{  // passport에 들어있는 함수 login: 홈페이지 login 항목 참고. register하면 바로 로그인 후의 welcome 페이지로 이동
            req.session.save(()=>{
                res.redirect('/welcome');
            });
        });        
    });
});

exp.get('/auth/logout', (req,res)=>{
    req.logout();  // 세션의 로그인 정보를 제거해줌. passport 내장 함수
    req.session.save(()=>{  // 세션이 안전하게 제거된 후 redirect
        res.redirect('/welcome');
    });
});

exp.listen(3000, ()=>{
    console.log('3000번 포트가 연결되었습니다.');
});