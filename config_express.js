module.exports = ()=>{
    
    const express = require('express')
    , session = require('express-session')
    , bodyParser = require('body-parser')
    , MySQLStore = require('express-mysql-session')(session);

    const exp = express();

    exp.set('views', './views_mysql');
    exp.set('view engine', 'jade');

    exp.use(bodyParser.urlencoded({ extended: false }));

    exp.use(session({
        secret: 'asdf1234@@',
        resave: false,
        saveUninitialized: true,
        store: new MySQLStore({  // sql의 sessions이라는 table에 세션 저장
            host: 'localhost',
            port: '3306',
            user: 'root',
            password: '111111',
            database: 'o2'
        })  
    }));

    return exp;
}