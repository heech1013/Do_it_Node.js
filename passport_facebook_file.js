const express = require('express')
, session = require('express-session')
, bodyParser = require('body-parser')
, FileStore = require('session-file-store')(session)
, bkfd2Password = require('pbkdf2-password')
, passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, FacebookStrategy = require('passport-facebook').Strategy;  //


let exp = express();

exp.use(bodyParser.urlencoded({ extended: false }));

exp.use(session({
    secret: 'asdf1234@@',
    resave: false,
    saveUninitialized: true,
    // store: new FileStore()  
}));

exp.use(passport.initialize());
exp.use(passport.session());  

var hasher = bkfd2Password();

var users = [
    {
        auth_id: 'local:egoing',  // local 방식, 타사인증 방식 모두 구별할 수 있는 사용자의 식별자는 auth_id가 된다.
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
    <a href="/auth/facebook">facebook</a>
    `;
    res.send(output);
});

passport.serializeUser((user, done)=>{  
    console.log('serializeUser', user);
    done(null, user.auth_id);  // 모든 사용자를 식별할 수 있는 식별자로 해야 함
  });
  
passport.deserializeUser((id, done)=>{  
    console.log('deserializeUser', id);
    for(var i=0; i<users.length; i++){
        var user = users[i];
        if(user.auth_id === id){  //
            return done(null, user);  
        }
    }
    done('There is no user.');  // 로그인한 상태에서 앱을 종료->user에 대한 정보는 날라가지만 세션 정보는 file에 남아있다. 이 오류 메시지가 뜰 때마다 session 폴더에서 파일을 지워주면 됨. session을 파일로 관리해서 생기는 문제
  });

passport.use(new LocalStrategy(  
    (username, password, done)=>{
        var username_input = username 
        , password_input = password;  
        for(var i=0; i<users.length; i++){
            var user = users[i];
            if(username_input === user.username){
                return hasher({password:password_input, salt:user.salt}, (err, pass, salt, hash)=>{  // return: 콜백으로 인해 for문이 다 돌고 who are you?를 출력한 뒤 hasher 안의 콜백함수를 실행할 가능성을 차단하기 위함.
                    if(hash === user.password){
                        console.log('LocalStrategy', user);
                        done(null, user); 
                    } else{
                        done(null, false); 
                    }
                });
            }
        }
        done(null, false);
    }
));

passport.use(new FacebookStrategy(  //
    {
        clientID: '205410380313515',  // APP ID
        clientSecret: '87472082bc5a17c9f976f5ee10a6bf1f',  // APP SECRET
        callbackURL: "/auth/facebook/callback",  // 보안 상 서로 확인하는 작업에 필요한 콜백. 밑에서 get으로 받음
        profileFields: ['id', 'displayName', 'email']  // 페이스북으로부터 받아올 정보에 대해 명시를 해주어야 정보들을 사용 가능하다(메뉴얼에 없다고 함)
    },
    function(accessToken, refreshToken, profile, done) {
        console.log(profile);
        var auth_id = 'facebook:'+profile.id;  // facebook을 통해서 인증된 아이디 값. profile을 통해 facebook으로부터 사용자에 대한 정보를 담은 객체가 전달됨.
        for(var i=0; i<users.length; i++){
            var user = users[i];
            if(user.auth_id === auth_id){
                return done(null, user);  // false가 아닌 값을 전달하면, serializeUser()로 연결, user 전달
            }
        }
        var new_user = {
            'auth_id': auth_id,
            'displayName': profile.displayName,  // 각각의 사용자가 다른 strategy를 통해서 로그인하더라도 공통의 데이터(displayName 등)를 통해 관리가 되어야 함
            'email': profile.emails[0].value  // 이메일 등 다른 정보도 받아올 경우 추가. 어떤 형식으로 받아오는지 console 찍어보면 됨.
        };
        users.push(new_user);
        done(null, new_user);  // serializeUser() 실행
    }
));

exp.post('/auth/login',
    passport.authenticate(  
        'local', 
        {
            successRedirect: '/welcome', 
            failureRedirect: '/auth/login', 
            failureFlash: false  
        }
    )
);

exp.get('/auth/facebook',  // 우리 앱에서 facebook으로 이동(내부에서 보안 상 확인하며)
    passport.authenticate(
        'facebook',
        {scope: 'email'}  // 사용자의 동의 하에 페이스북을 통해 사용자의 정보를 추가로 받아올 수 있다.(facebook login scope 검색) email은 여러모로 꼭 받아야 하는 정보이다.
    ));

exp.get('/auth/facebook/callback',  // facebook에서 다시 우리 앱으로 왕복(내부에서 보안 상 확인하며)
    passport.authenticate(
        'facebook',
        { 
            successRedirect: '/welcome',  // 로그인에 성공했을 때
            failureRedirect: '/auth/login'  // 로그인에 실패했을 때
        }
    )
);    

exp.get('/welcome', (req,res)=>{
    if(req.user && req.user.displayName){ 
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
            auth_id: 'local:'+req.body.username,  //
            username: req.body.username,
            password: hash,  
            salt: salt,  
            displayName: req.body.displayName
        };
        users.push(user_new);
        req.login(user_new, (err)=>{  
            req.session.save(()=>{
                res.redirect('/welcome');
            });
        });        
    });
});

exp.get('/auth/logout', (req,res)=>{
    req.logout();  
    req.session.save(()=>{
        res.redirect('/welcome');
    });
});

exp.listen(3000, ()=>{
    console.log('3000번 포트가 연결되었습니다.');
});