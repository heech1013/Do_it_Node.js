module.exports = (exp)=>{
    const bkfd2Password = require('pbkdf2-password')
    , passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , FacebookStrategy = require('passport-facebook').Strategy
    , conn = require('./config_mysql')();  // mysql conn과 관련된 모듈


    exp.use(passport.initialize());
    exp.use(passport.session());  

    var hasher = bkfd2Password();

    passport.serializeUser((user, done)=>{  
        console.log('serializeUser', user);
        done(null, user.auth_id); 
    });
    
    passport.deserializeUser((id, done)=>{  
        console.log('deserializeUser', id);
        var sql = 'SELECT * FROM users WHERE auth_id=?';
        conn.query(sql, [id], (err, results)=>{ // id에 auth_id값이 들어옴
            if(err){
                console.log(err);
                done('There is no user');
            } else{
                done(null, results[0]);
            }
        })
    });

    passport.use(new LocalStrategy(  
        (username, password, done)=>{
            var username_input = username 
            , password_input = password;  
            var sql = 'SELECT * FROM users WHERE auth_id=?';
            conn.query(sql, ['local:'+username_input], (err, results)=>{  // 두 번째 인자: '?'에 들어갈 값
                if(err){
                    return done('There is no user.');
                }
                var user = results[0];  // sql문을 통해 가져온 정보 배열
                return hasher({password:password_input, salt:user.salt}, (err, pass, salt, hash)=>{  // return: 콜백으로 인해 for문이 다 돌고 who are you?를 출력한 뒤 hasher 안의 콜백함수를 실행할 가능성을 차단하기 위함.
                    if(hash === user.password){
                        console.log('LocalStrategy', user);
                        done(null, user); 
                    } else{
                        done(null, false); 
                    }
                });
            });
        }
    ));

    passport.use(new FacebookStrategy(
        {
            clientID: '205410380313515',
            clientSecret: '87472082bc5a17c9f976f5ee10a6bf1f',
            callbackURL: "/auth/facebook/callback",
            profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'displayName']
        },
        (accessToken, refreshToken, profile, done)=>{
            console.log(profile);
            var auth_id = 'facebook:'+profile.id;
            var sql = 'SELECT * FROM users WHERE auth_id=?';
            conn.query(sql, [auth_id], (err, results)=>{
                if(results.length>0){
                    done(null, results[0]);
                } else{
                    var new_user = {
                        'auth_id': auth_id,
                        'displayName': profile.displayName,
                        // 'email': profile.emails[0].value  // 이메일만 이상하게 안됨 ㅠㅠ 원인 못 찾음
                    };
                    var sql = 'INSERT INTO users SET ?';
                    conn.query(sql, new_user, (err, results)=>{
                        if(err){
                            console.log(err);
                            done('ERROR');
                        } else{
                            done(null, new_user);
                        }
                    });
                }
            });
        }
    ));
    
    return passport;
}