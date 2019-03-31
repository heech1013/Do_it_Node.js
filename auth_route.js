module.exports = (passport)=>{

    var route = require('express').Router();  // router 객체 생성. express.Router()
    var conn = require('./config_mysql')();  // mysql conn과 관련된 모듈
    
    const bkfd2Password = require('pbkdf2-password');  // hasher를 정의하기 위해 필요
    var hasher = bkfd2Password();  // hasher를 사용하기 위해 passport로부터 받아온다.
    
    route.get('/login', (req, res)=>{
        var sql = 'SELECT id, title FROM topic';
        conn.query(sql, (err, rowS)=>{
            res.render('auth/login', {rowS:rowS});
        });
    });

    route.post('/login',
        passport.authenticate(  
            'local', 
            {
                successRedirect: '/home', //
                failureRedirect: '/auth/login',
                failureFlash: false  
            }
        )
    );

    route.get('/facebook',
        passport.authenticate(
            'facebook',
            {scope: 'email'} 
        ));

    route.get('/facebook/callback',
        passport.authenticate(
            'facebook',
            {
                successRedirect: '/home',
                failureRedirect: '/auth/login'
            }
        )
    );

    route.get('/register', (req,res)=>{
        var sql = 'SELECT id, title FROM topic';
        conn.query(sql, (err, rowS)=>{
            res.render('auth/register', {rowS:rowS});
        });
    });

    route.post('/register', (req,res)=>{
        hasher({password:req.body.password}, (err, pass, salt, hash)=>{ 
            var user_new = {
                auth_id: 'local:'+req.body.username,  //
                username: req.body.username,
                password: hash,
                salt: salt,  
                displayName: req.body.displayName
            };
            var sql = 'INSERT INTO users SET ?';  // conn.query의 user_new값이 '?'로 들어와서, user_new와 같은 구성으로 sql에 추가할 수 있다.
            conn.query(sql, user_new, (err, results)=>{
                if(err){
                    console.log(err);
                    res.status(500);
                } else{
                    req.login(user_new, (err)=>{  // 회원가입 후 바로 로그인될 수 있도록
                        req.session.save(()=>{
                            res.redirect('/home');
                        });
                    });
                }
            });        
        });
    });

    route.get('/logout', (req,res)=>{
        req.logout();  
        req.session.save(()=>{
            res.redirect('/home');
        });
    });

    return route;
};