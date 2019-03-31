const exp = require('./config_express')();

var users = [
    {
        auth_id: 'local:egoing',
        username: 'egoing',
        password: 'uW8wtDfOZclSXdOBHmgsFGRE2zDNfDEVuJ9o/66GdN68y1yN0nWTzhBAa8sl7nPo3kTpxVSI/gG9jInuml5F3VAoMkRGviBHh3keZFeBo4aRgBQnoPgN5Y8ovU0DEL0X+5p5kh/RvVMuLlZ1g+yagF5cGVmjtY2mSqzNZSu5BnU=', 
        displayName: 'EGOING',
        salt: 'unagtHzN52ARFiDJXEnkiccQvqJhded965woQwxuD/wDMPQpyp7axoz4mcYfgD/BEGSV79f200P30mnuoW573w=='  
    }
];

const passport = require('./config_passport')(exp);

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

const auth = require('./auth_route')(passport);  
exp.use('/auth/', auth);

exp.listen(3000, ()=>{
    console.log('3000번 포트가 연결되었습니다.');
});