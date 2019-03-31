const exp = require('./config_express')();

const passport = require('./config_passport')(exp);

const auth = require('./auth_route')(passport);  
exp.use('/auth/', auth);

const home = require('./routes/home')();
exp.use('/home', home);

exp.listen(3000, ()=>{
    console.log('3000번 서버가 연결되었습니다.');
});

/*

메인: page_sql.js

express 설정: config_express.js
passport 설정: passport_facebook_mysql.js

auth 라우터: auth_route.js
home 라우터: home.js

login 템플릿: views_mysql/auth/login.jade
register 템플릿: views_mysql/auth/register.jade

기본 layout 템플릿: views_mysql/CRUD/layout.jade
add 템플릿: views_mysql/CRUD/add.jade
view 템플릿: views_mysql/CRUD/view.jade
edit 템플릿: views_mysql/CRUD/edit.jade
delete 템플릿: views_mysql/CRUD/delete.jade

*/